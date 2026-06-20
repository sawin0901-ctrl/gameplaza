import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { getDigisellerToken, getDigisellerProducts, clearTokenCache } from "../../../../../lib/digiseller"

export const dynamic = "force-dynamic"

interface Check {
  name: string
  ok: boolean
  message: string
  detail?: string
  duration?: number
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const checks: Check[] = []
  const sellerId = process.env.DIGISELLER_SELLER_ID
  const apiKey = process.env.DIGISELLER_API_KEY

  // 1. Credentials check
  const credOk = !!(sellerId && apiKey && sellerId !== "your-seller-id" && apiKey !== "your-api-key")
  checks.push({
    name: "Настройки (.env)",
    ok: credOk,
    message: credOk
      ? `DIGISELLER_SELLER_ID=${sellerId} · API ключ задан`
      : "DIGISELLER_SELLER_ID или DIGISELLER_API_KEY не заданы в .env",
  })

  if (!credOk) {
    return NextResponse.json({ ok: false, checks })
  }

  // 2. Authentication (get token from /api/apilogin via POST)
  clearTokenCache() // Force fresh token for this test
  let token: string | null = null
  const authStart = Date.now()
  try {
    token = await getDigisellerToken()
    checks.push({
      name: "Авторизация (POST /api/apilogin)",
      ok: true,
      message: "Токен получен успешно",
      detail: `token: ${token.slice(0, 8)}...`,
      duration: Date.now() - authStart,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    checks.push({
      name: "Авторизация (POST /api/apilogin)",
      ok: false,
      message: msg,
      duration: Date.now() - authStart,
    })
    return NextResponse.json({ ok: false, checks })
  }

  // 3. Fetch seller goods (POST /api/seller-goods)
  const catalogStart = Date.now()
  try {
    const data = await getDigisellerProducts(1, 5)
    checks.push({
      name: "Каталог товаров (POST /api/seller-goods)",
      ok: true,
      message: `Загружено ${data.rows.length} товаров. Всего в каталоге: ${data.count}. Страниц: ${data.pages}.`,
      detail: data.rows.slice(0, 3).map(r => `[${r.id_goods}] ${r.name_goods?.slice(0, 40)}`).join("; "),
      duration: Date.now() - catalogStart,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    checks.push({
      name: "Каталог товаров (POST /api/seller-goods)",
      ok: false,
      message: msg,
      duration: Date.now() - catalogStart,
    })
    return NextResponse.json({ ok: false, checks })
  }

  // 4. API connectivity
  checks.push({
    name: "API доступен",
    ok: true,
    message: "Все проверки пройдены",
  })

  return NextResponse.json({ ok: true, checks })
}
