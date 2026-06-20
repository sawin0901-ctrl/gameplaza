import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { sendPasswordResetEmail } from "../../../../lib/email"
import { rateLimit } from "../../../../lib/rate-limit"
import crypto from "crypto"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    // Rate limit: не более 5 запросов в час с одного IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
    if (!rateLimit(`forgot:${ip}`, 5, 60 * 60 * 1000)) {
      // Возвращаем ok чтобы не раскрывать факт блокировки
      return NextResponse.json({ ok: true })
    }

    const body = await req.json().catch(() => ({}))
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : ""

    if (!email || !EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ ok: true }) // не раскрываем причину отказа
    }

    const user = await prisma.user.findUnique({ where: { email } })

    // Всегда возвращаем ok — чтобы нельзя было перечислить существующие email
    if (user) {
      const token = crypto.randomBytes(32).toString("hex")
      const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 час

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: token, resetTokenExpiry: expiry },
      })

      sendPasswordResetEmail(user.email, token).catch(err =>
        console.error("[forgot-password] email send failed:", err.message)
      )
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
