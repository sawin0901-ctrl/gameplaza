import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { rateLimit } from "../../../../lib/rate-limit"
import { sendVerificationEmail } from "../../../../lib/email"
import { z } from "zod"

const RegisterSchema = z.object({
  name: z
    .string()
    .min(2, "Имя — минимум 2 символа")
    .max(100, "Имя слишком длинное")
    .trim(),
  email: z
    .string()
    .email("Некорректный email")
    .max(254, "Email слишком длинный")
    .transform(v => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, "Пароль — минимум 8 символов")
    .max(128, "Пароль слишком длинный"),
})

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
    if (!rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Слишком много запросов. Попробуйте через час." },
        { status: 429 },
      )
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 })
    }

    const parsed = RegisterSchema.safeParse(body)
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Некорректные данные"
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const { name, email, password } = parsed.data

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      return NextResponse.json({ error: "Этот email уже зарегистрирован" }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)
    const verificationToken = crypto.randomBytes(32).toString("hex")

    await prisma.user.create({
      data: { name, email, password: hashed, verificationToken },
    })

    sendVerificationEmail(email, verificationToken).catch(err =>
      console.error("[register] email send failed:", err.message)
    )

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Ошибка сервера. Попробуйте позже." }, { status: 500 })
  }
}
