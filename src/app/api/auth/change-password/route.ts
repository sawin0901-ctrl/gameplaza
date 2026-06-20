import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import bcrypt from "bcryptjs"
import { rateLimit } from "../../../../lib/rate-limit"
import { z } from "zod"

const Schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Rate limit: 5 попыток за 15 минут на пользователя
  if (!rateLimit(`chpwd:${session.user.id}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Ошибка валидации"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  const { currentPassword, newPassword } = parsed.data

  const email = session.user.email
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })

  // OAuth-пользователи не имеют пароля
  if (!user.password) {
    return NextResponse.json({ error: "Аккаунт не поддерживает смену пароля (OAuth)" }, { status: 400 })
  }

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) return NextResponse.json({ error: "Неверный текущий пароль" }, { status: 400 })

  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } })

  return NextResponse.json({ ok: true })
}
