import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { rateLimit } from "../../../../lib/rate-limit"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  if (!rateLimit(`promo:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Слишком много попыток" }, { status: 429 })
  }

  let body: { code?: string; subtotal?: number }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const code = (body.code ?? "").trim().toUpperCase().slice(0, 50)
  const subtotal = Number(body.subtotal ?? 0)

  if (!code) return NextResponse.json({ error: "Введите промокод" }, { status: 422 })

  const promo = await prisma.promoCode.findFirst({
    where: { code, isActive: true },
  })

  if (!promo) return NextResponse.json({ error: "Промокод не найден или недействителен" }, { status: 404 })

  if (promo.expiresAt && promo.expiresAt < new Date()) {
    return NextResponse.json({ error: "Срок действия промокода истёк" }, { status: 400 })
  }

  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return NextResponse.json({ error: "Промокод исчерпан — лимит использований" }, { status: 400 })
  }

  if (promo.minOrderAmount && subtotal < promo.minOrderAmount) {
    return NextResponse.json({
      error: `Минимальная сумма заказа: ${promo.minOrderAmount.toLocaleString("ru-RU")} ₽`,
    }, { status: 400 })
  }

  const discount = promo.type === "percent"
    ? Math.round((subtotal * promo.value) / 100)
    : Math.min(promo.value, subtotal)

  return NextResponse.json({
    code: promo.code,
    type: promo.type,
    value: promo.value,
    discount,
    description: promo.description,
  })
}
