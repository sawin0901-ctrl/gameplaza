import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import bcrypt from "bcryptjs"
import { rateLimit } from "../../../../lib/rate-limit"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
    if (!rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Слишком много запросов. Попробуйте через час." }, { status: 429 })
    }

    const { name, email, password } = await req.json()

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: "Заполните все поля" }, { status: 400 })
    }
    if (!EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: "Некорректный email" }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Пароль — минимум 6 символов" }, { status: 400 })
    }

    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (exists) {
      return NextResponse.json({ error: "Этот email уже зарегистрирован" }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)
    await prisma.user.create({
      data: { name: name.trim(), email: email.toLowerCase().trim(), password: hashed },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Ошибка сервера. Попробуйте позже." }, { status: 500 })
  }
}
