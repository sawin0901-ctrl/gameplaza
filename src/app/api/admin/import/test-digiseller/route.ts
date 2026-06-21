import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { clearTokenCache } from "../../../../../lib/digiseller"
import axios from "axios"
import crypto from "crypto"

export const dynamic = "force-dynamic"

interface Check {
  name: string
  ok: boolean
  message: string
  detail?: string
  duration?: number
  raw?: unknown
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const checks: Check[] = []
  const sellerIdRaw = process.env.DIGISELLER_SELLER_ID ?? ""
  const apiKeyRaw   = process.env.DIGISELLER_API_KEY   ?? ""
  const sellerId    = sellerIdRaw.trim()
  const apiKey      = apiKeyRaw.trim()

  // ── 1. Env vars ──────────────────────────────────────────────────────────────
  const envOk = !!(
    sellerId && sellerId !== "your-seller-id" &&
    apiKey   && apiKey   !== "your-api-key"
  )
  checks.push({
    name: "Переменные окружения (.env)",
    ok: envOk,
    message: envOk
      ? `SELLER_ID задан (${sellerId}) · API_KEY задан (длина: ${apiKey.length}, начинается: ${apiKey.slice(0, 4)}****)`
      : [
          !sellerId || sellerId === "your-seller-id" ? "❌ DIGISELLER_SELLER_ID не задан" : "",
          !apiKey   || apiKey   === "your-api-key"   ? "❌ DIGISELLER_API_KEY не задан"   : "",
        ].filter(Boolean).join("\n"),
    detail: sellerIdRaw !== sellerId
      ? `⚠️ SELLER_ID содержал пробелы (удалены)`
      : apiKeyRaw !== apiKey
      ? `⚠️ API_KEY содержал пробелы/переносы строк (${apiKeyRaw.length - apiKey.length} лишних символов)`
      : undefined,
  })

  if (!envOk) return NextResponse.json({ ok: false, checks })

  // ── 2. Sign test (показываем что будет отправлено) ───────────────────────────
  const timestamp = Math.floor(Date.now() / 1000)
  const sign = crypto.createHash("md5").update(apiKey + timestamp).digest("hex")

  checks.push({
    name: "Формирование подписи (MD5)",
    ok: true,
    message: "Подпись сформирована",
    detail: `timestamp: ${timestamp} · sign: ${sign.slice(0, 8)}...${sign.slice(-4)} · sellerId: ${sellerId}`,
  })

  // ── 3. Direct auth call (raw axios, full response) ───────────────────────────
  clearTokenCache()
  const authStart = Date.now()
  let token: string | null = null

  try {
    const body = {
      seller_id: parseInt(sellerId, 10),
      apikey: apiKey,
      sign,
      timestamp,
      lang: "ru-RU",
    }

    const res = await axios.post(
      "https://api.digiseller.ru/api/apilogin",
      body,
      {
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        timeout: 15000,
        validateStatus: () => true, // don't throw on non-2xx
      },
    )

    const duration = Date.now() - authStart
    const data = res.data

    if (data?.retval === 0 && data?.token) {
      token = data.token
      checks.push({
        name: "Авторизация Digiseller (POST /api/apilogin)",
        ok: true,
        message: "✅ Токен получен успешно",
        detail: `HTTP ${res.status} · token: ${String(token).slice(0, 8)}... · время: ${duration}ms`,
        duration,
        raw: { retval: data.retval, retdesc: data.retdesc },
      })
    } else {
      const code = data?.retval ?? "?"
      const desc = data?.retdesc ?? "нет описания"
      const hints: Record<number, string> = {
        "-2": "Неверные параметры. Проверьте DIGISELLER_SELLER_ID (должен быть числом).",
        "-3": "Продавец не найден. Проверьте DIGISELLER_SELLER_ID.",
        "-4": "Неверная подпись. Скопируйте DIGISELLER_API_KEY заново — он может содержать невидимые символы.",
        "-5": "Дублирующийся запрос. Попробуйте ещё раз.",
        "-7": "Доступ запрещён. Проверьте права API-ключа в кабинете Digiseller.",
        "-10": "API ключ заблокирован. Создайте новый ключ.",
      }
      const hint = (hints as Record<string, string>)[String(code)] ?? "Проверьте API ключ и Seller ID."

      checks.push({
        name: "Авторизация Digiseller (POST /api/apilogin)",
        ok: false,
        message: `❌ Код ${code}: ${desc}\n💡 ${hint}`,
        detail: `HTTP ${res.status} · время: ${duration}ms · Endpoint: /api/apilogin`,
        duration,
        raw: { retval: code, retdesc: desc, http: res.status },
      })
      return NextResponse.json({ ok: false, checks })
    }
  } catch (err) {
    const duration = Date.now() - authStart
    const msg = axios.isAxiosError(err)
      ? err.code === "ECONNABORTED" ? "Таймаут (>15с)"
      : err.code === "ENOTFOUND"   ? "DNS не разрешается — проверьте интернет на сервере"
      : `HTTP ${err.response?.status ?? "нет ответа"}: ${JSON.stringify(err.response?.data ?? {}).slice(0, 200)}`
      : String(err)

    checks.push({ name: "Авторизация Digiseller", ok: false, message: msg, duration })
    return NextResponse.json({ ok: false, checks })
  }

  // ── 4. Catalog check ─────────────────────────────────────────────────────────
  const catStart = Date.now()
  try {
    const res = await axios.post(
      "https://api.digiseller.ru/api/seller-goods",
      { seller_id: parseInt(sellerId, 10), token, page: 1, rows: 5, order: "date", direction: "desc" },
      { headers: { Accept: "application/json", "Content-Type": "application/json" }, timeout: 20000, validateStatus: () => true },
    )
    const duration = Date.now() - catStart
    const data = res.data

    if (Array.isArray(data?.rows)) {
      checks.push({
        name: "Каталог товаров (POST /api/seller-goods)",
        ok: true,
        message: `✅ Загружено ${data.rows.length} товаров · Всего: ${data.count ?? "?"} · Страниц: ${data.pages ?? "?"}`,
        detail: data.rows.slice(0, 3).map((r: { id_goods: number; name_goods: string }) =>
          `[${r.id_goods}] ${String(r.name_goods).slice(0, 50)}`
        ).join("\n"),
        duration,
      })
    } else {
      const code = data?.retval
      checks.push({
        name: "Каталог товаров (POST /api/seller-goods)",
        ok: false,
        message: `❌ Код ${code ?? "?"}: ${data?.retdesc ?? "Неожиданный ответ"}`,
        detail: JSON.stringify(data).slice(0, 300),
        duration,
        raw: data,
      })
      return NextResponse.json({ ok: false, checks })
    }
  } catch (err) {
    const msg = axios.isAxiosError(err) ? err.message : String(err)
    checks.push({ name: "Каталог товаров", ok: false, message: msg, duration: Date.now() - catStart })
    return NextResponse.json({ ok: false, checks })
  }

  // ── 5. Summary ───────────────────────────────────────────────────────────────
  checks.push({
    name: "Итог",
    ok: true,
    message: "✅ Все проверки пройдены. Digiseller настроен корректно.",
  })

  return NextResponse.json({ ok: true, checks })
}
