import nodemailer from "nodemailer"

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
}

const FROM = process.env.SMTP_FROM || '"GamePlaza" <noreply@gameplaza.site>'
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://gameplaza.site"

const baseHtml = (content: string) => `<!DOCTYPE html>
<html><body style="background:#0a0a0f;font-family:system-ui,sans-serif;margin:0;padding:24px">
<div style="max-width:480px;margin:0 auto;background:#111118;border:1px solid #1f2937;border-radius:16px;padding:32px">
  <div style="text-align:center;margin-bottom:24px">
    <div style="background:#7c3aed;width:48px;height:48px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#fff">G</div>
    <div style="color:#fff;font-size:18px;font-weight:700;margin-top:8px"><span style="color:#a78bfa">Game</span>Plaza</div>
  </div>
  ${content}
  <p style="color:#4b5563;font-size:11px;text-align:center;margin-top:24px;border-top:1px solid #1f2937;padding-top:16px">
    Если вы не запрашивали это письмо — просто проигнорируйте его.
  </p>
</div>
</body></html>`

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  if (!process.env.SMTP_HOST) {
    console.log(`[email] SMTP not configured. Verification link: ${SITE}/api/auth/verify-email?token=${token}`)
    return
  }
  const url = `${SITE}/api/auth/verify-email?token=${token}`
  await createTransport().sendMail({
    from: FROM,
    to: email,
    subject: "Подтвердите ваш email — GamePlaza",
    html: baseHtml(`
      <h2 style="color:#fff;font-size:20px;margin:0 0 8px">Подтвердите email</h2>
      <p style="color:#9ca3af;font-size:14px;margin:0 0 24px">Нажмите кнопку ниже, чтобы подтвердить ваш адрес электронной почты.</p>
      <div style="text-align:center;margin-bottom:24px">
        <a href="${url}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;display:inline-block">
          Подтвердить email
        </a>
      </div>
      <p style="color:#6b7280;font-size:12px;text-align:center">Ссылка действительна 24 часа</p>
    `),
  })
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  if (!process.env.SMTP_HOST) {
    console.log(`[email] SMTP not configured. Reset link: ${SITE}/auth/reset-password?token=${token}`)
    return
  }
  const url = `${SITE}/auth/reset-password?token=${token}`
  await createTransport().sendMail({
    from: FROM,
    to: email,
    subject: "Сброс пароля — GamePlaza",
    html: baseHtml(`
      <h2 style="color:#fff;font-size:20px;margin:0 0 8px">Сброс пароля</h2>
      <p style="color:#9ca3af;font-size:14px;margin:0 0 24px">Вы запросили сброс пароля. Нажмите кнопку ниже для создания нового.</p>
      <div style="text-align:center;margin-bottom:24px">
        <a href="${url}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;display:inline-block">
          Сбросить пароль
        </a>
      </div>
      <p style="color:#6b7280;font-size:12px;text-align:center">Ссылка действительна 1 час</p>
    `),
  })
}
