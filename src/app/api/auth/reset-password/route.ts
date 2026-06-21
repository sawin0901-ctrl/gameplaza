import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { rateLimit } from "../../../../lib/rate-limit"
import bcrypt from "bcryptjs"
import { z } from "zod"

const Schema = z.object({
  token: z.string().min(10).max(200),
  password: z.string().min(8).max(128),
})

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
    if (!rateLimit(`reset-pwd:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Слишком много попыток. Подождите 15 минут." }, { status: 429 })
    }

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Неверный запрос" }, { status: 400 })
    }

    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Неверный запрос" }, { status: 400 })
    }

    const { token, password } = parsed.data

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Ссылка недействительна или истекла" }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExpiry: null },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}