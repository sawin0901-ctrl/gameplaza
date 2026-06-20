import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json({ error: "Неверный запрос" }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Пароль — минимум 8 символов" }, { status: 400 })
    }

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
