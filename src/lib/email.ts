import nodemailer from "nodemailer"

let _transport: nodemailer.Transporter | null = null
function getTransport(): nodemailer.Transporter {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  return _transport
}

const FROM = process.env.SMTP_FROM || '"GamePlaza" <noreply@gameplaza.site>'
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://gameplaza.site"

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
}

const baseHtml = (content: string) => `<!DOCTYPE html>
<html><body style="background:#0a0a0f;font-family:system-ui,sans-serif;margin:0;padding:24px">
<div style="max-width:520px;margin:0 auto;background:#111118;border:1px solid #1f2937;border-radius:16px;padding:32px">
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

async function sendMail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_HOST) {
    console.log(`[email] SMTP not configured. Subject: ${subject} → ${to}`)
    return
  }
  try {
    await getTransport().sendMail({ from: FROM, to: escapeHtml(to), subject, html })
  } catch (err) {
    console.error("[email] Send failed:", err)
    throw err
  }
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const url = `${SITE}/api/auth/verify-email?token=${encodeURIComponent(token)}`
  await sendMail(email, "Подтвердите ваш email — GamePlaza", baseHtml(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px">Подтвердите email</h2>
    <p style="color:#9ca3af;font-size:14px;margin:0 0 24px">Нажмите кнопку ниже, чтобы подтвердить ваш адрес электронной почты.</p>
    <div style="text-align:center;margin-bottom:24px">
      <a href="${escapeHtml(url)}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;display:inline-block">Подтвердить email</a>
    </div>
    <p style="color:#6b7280;font-size:12px;text-align:center">Ссылка действительна 24 часа</p>
  `))
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const url = `${SITE}/auth/reset-password?token=${encodeURIComponent(token)}`
  await sendMail(email, "Сброс пароля — GamePlaza", baseHtml(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px">Сброс пароля</h2>
    <p style="color:#9ca3af;font-size:14px;margin:0 0 24px">Вы запросили сброс пароля. Нажмите кнопку ниже для создания нового.</p>
    <div style="text-align:center;margin-bottom:24px">
      <a href="${escapeHtml(url)}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;display:inline-block">Сбросить пароль</a>
    </div>
    <p style="color:#6b7280;font-size:12px;text-align:center">Ссылка действительна 1 час</p>
  `))
}

export interface OrderEmailItem {
  name: string
  price: number
  digiId: number
}

export async function sendOrderConfirmation(
  email: string,
  orderId: string,
  items: OrderEmailItem[],
  total: number,
  discount = 0,
): Promise<void> {
  const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽"
  const itemsHtml = items.map(i => `
    <tr>
      <td style="padding:10px 0;color:#e5e7eb;font-size:14px;border-bottom:1px solid #1f2937">${escapeHtml(i.name)}</td>
      <td style="padding:10px 0;color:#a78bfa;font-size:14px;border-bottom:1px solid #1f2937;text-align:right;white-space:nowrap">${fmt(i.price)}</td>
    </tr>
  `).join("")

  await sendMail(email, `Заказ #${orderId.slice(-8).toUpperCase()} оформлен — GamePlaza`, baseHtml(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 4px">Заказ оформлен!</h2>
    <p style="color:#6b7280;font-size:12px;margin:0 0 20px">№ ${orderId.slice(-8).toUpperCase()}</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${itemsHtml}
    </table>
    ${discount > 0 ? `<p style="color:#10b981;font-size:13px;margin:12px 0 4px">Скидка по промокоду: −${fmt(discount)}</p>` : ""}
    <p style="color:#fff;font-size:16px;font-weight:700;margin:12px 0 20px">Итого: ${fmt(total)}</p>
    <p style="color:#9ca3af;font-size:13px;margin:0 0 20px">Товар будет доставлен через Digiseller. Проверьте ваш аккаунт Digiseller или электронную почту, указанную при оплате.</p>
    <div style="text-align:center">
      <a href="${SITE}/account/orders" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;display:inline-block">Мои заказы</a>
    </div>
  `))
}

export async function sendPromoWelcome(email: string, name: string, promoCode: string, discountValue: number): Promise<void> {
  await sendMail(email, `Ваш промокод на скидку ${discountValue}% — GamePlaza`, baseHtml(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px">Привет, ${escapeHtml(name || "друг")}!</h2>
    <p style="color:#9ca3af;font-size:14px;margin:0 0 20px">Для вас подготовлен персональный промокод на скидку ${discountValue}%:</p>
    <div style="background:#1f2937;border:2px dashed #7c3aed;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
      <div style="color:#a78bfa;font-size:28px;font-weight:900;letter-spacing:4px">${escapeHtml(promoCode)}</div>
      <div style="color:#6b7280;font-size:12px;margin-top:8px">Скидка ${discountValue}% на весь заказ</div>
    </div>
    <div style="text-align:center">
      <a href="${SITE}/catalog" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;display:inline-block">В каталог</a>
    </div>
  `))
}

export async function sendPriceDropAlert(
  email: string,
  productName: string,
  productSlug: string,
  oldPrice: number,
  newPrice: number,
): Promise<void> {
  const fmt = (n: number) => n.toLocaleString("ru-RU") + " ₽"
  const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100)
  await sendMail(email, `Цена снизилась: ${productName} — GamePlaza`, baseHtml(`
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px">Цена снизилась!</h2>
    <p style="color:#9ca3af;font-size:14px;margin:0 0 16px">Товар из вашего списка желаний подешевел на <span style="color:#10b981;font-weight:700">${discount}%</span></p>
    <div style="background:#1f2937;border-radius:12px;padding:16px;margin-bottom:20px">
      <div style="color:#e5e7eb;font-size:15px;font-weight:600;margin-bottom:8px">${escapeHtml(productName)}</div>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="color:#6b7280;font-size:14px;text-decoration:line-through">${fmt(oldPrice)}</span>
        <span style="color:#10b981;font-size:20px;font-weight:700">${fmt(newPrice)}</span>
        <span style="background:#10b981;color:#fff;font-size:11px;padding:2px 8px;border-radius:20px;font-weight:700">-${discount}%</span>
      </div>
    </div>
    <div style="text-align:center">
      <a href="${SITE}/product/${escapeHtml(productSlug)}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:600;display:inline-block">Купить сейчас</a>
    </div>
  `))
}
