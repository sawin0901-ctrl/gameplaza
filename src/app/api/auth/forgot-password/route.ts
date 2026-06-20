import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { sendPasswordResetEmail } from "../../../../lib/email"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email?.trim()) {
      return NextResponse.json({ error: "Введите email" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })

    // Always return OK to prevent email enumeration
    if (user) {
      const token = crypto.randomBytes(32).toString("hex")
      const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiry: expiry },
      })

      await sendPasswordResetEmail(user.email, token).catch(err =>
        console.error("[forgot-password] email send failed:", err.message)
      )
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
