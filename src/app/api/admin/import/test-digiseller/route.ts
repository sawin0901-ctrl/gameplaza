import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { clearTokenCache } from "../../../../../lib/digiseller"
import axios from "axios"
import crypto from "crypto"

export const dynamic = "force-dynamic"

interface Check { name: string; ok: boolean; message: string; detail?: string; duration?: number; raw?: unknown }

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const checks: Check[] = []
  const sellerIdRaw = process.env.DIGISELLER_SELLER_ID ?? ""
  const apiKeyRaw   = process.env.DIGISELLER_API_KEY   ?? ""
  const sellerId    = sellerIdRaw.trim()
  const apiKey      = apiKeyRaw.trim()
  const sellerIdInt = parseInt(sellerId, 10)

  // ── 1. Env vars ───────────────────────────────────────────────────────────
  const envOk = !!(sellerId && !isNaN(sellerIdInt) && apiKey && apiKey.length >= 8)
  const hasWhitespace = sellerIdRaw !== sellerId || apiKeyRaw !== apiKey
  checks.push({
    name: "Переменные окружения (.env)",
    ok: envOk,
    message: envOk
      ? `SELLER_ID: ${sellerId} · API_KEY длина: ${apiKey.length} символов · начало: ${apiKey.slice(0, 6)}...`
      : [
          !sellerId ? "❌ DIGISELLER_SELLER_ID не задан" : "",
          isNaN(sellerIdInt) ? "❌ DIGISELLER_SELLER_ID не является числом" : "",
          !apiKey ? "❌ DIGISELLER_API_KEY не задан" : "",
          apiKey.length < 8 ? "❌ DIGISELLER_API_KEY слишком короткий" : "",
        ].filter(Boolean).join("\n"),
    detail: hasWhitespace
      ? `⚠️ Обнаружены лишние пробелы/переносы строк в .env! Удалено ${(sellerIdRaw + apiKeyRaw).length - (sellerId + apiKey).length} символов`
      : `Формат ключа: ${apiKey.includes("-") ? "GUID (xxxx-xxxx-xxxx)" : "строка"} · Seller ID: ${sellerIdInt}`,
  })

  if (!envOk) return NextResponse.json({ ok: false, checks })

  // ── 2. Server time ────────────────────────────────────────────────────────
  const nowTs = Math.floor(Date.now() / 1000)
  checks.push({
    name: "Время сервера (UTC)",
    ok: true,
    message: `timestamp: ${nowTs} · ${new Date().toISOString()}`,
    detail: "Digiseller отклоняет запросы с расхождением >300 сек от их серверного времени",
  })

  // ── 3. Sign formation ─────────────────────────────────────────────────────
  const timestamp = Math.floor(Date.now() / 1000)
  const signInput = apiKey + String(timestamp)
  const sign = crypto.createHash("md5").update(signInput).digest("hex")
  checks.push({
    name: "MD5 подпись",
    ok: true,
    message: `sign: ${sign.slice(0, 8)}...${sign.slice(-4)}`,
    detail: `Входные данные: apikey(${apiKey.length} chars) + timestamp(${timestamp}) → MD5 → ${sign}`,
  })

  // ── 4. Auth request ───────────────────────────────────────────────────────
  clearTokenCache()
  const authStart = Date.now()
  let token: string | null = null

  try {
    const body = { seller_id: sellerIdInt, apikey: apiKey, sign, timestamp, lang: "ru-RU" }
    const res = await axios.post(
      "https://api.digiseller.ru/api/apilogin",
      body,
      { headers: { Accept: "application/json", "Content-Type": "application/json" }, timeout: 15000, validateStatus: () => true },
    )
    const duration = Date.now() - authStart
    const data = res.data

    if (data?.retval === 0 && data?.token) {
      token = data.token
      checks.push({
        name: "Авторизация Digiseller (/api/apilogin)",
        ok: true,
        message: "✅ Токен получен успешно",
        detail: `HTTP ${res.status} · token: ${String(token).slice(0, 10)}... · ${duration}ms`,
        duration,
        raw: { retval: data.retval, retdesc: data.retdesc },
      })
    } else {
      const code = data?.retval ?? "?"
      const desc = data?.retdesc ?? ""
      const hints: Record<string, string> = {
        "-1": "API ключ не соответствует Seller ID, либо ключ не активирован в кабинете Digiseller.\n" +
              "→ my.digiseller.com → Настройки → API → скопируйте ключ заново\n" +
              "→ Проверьте: cat /var/www/gameplaza/.env | grep DIGISELLER",
        "-2": "Неверный формат параметров. seller_id должен быть целым числом.",
        "-3": "Продавец не найден. Проверьте DIGISELLER_SELLER_ID.",
        "-4": "Неверная подпись. Скопируйте API_KEY заново — скорее всего невидимые символы.",
        "-5": "Дублирующийся timestamp. Попробуйте ещё раз через секунду.",
        "-7": "Доступ запрещён. Проверьте права API-ключа.",
        "-10": "Ключ заблокирован. Создайте новый в кабинете Digiseller.",
      }
      const hint = hints[String(code)] ?? `Неизвестный код. Полный ответ: ${JSON.stringify(data)}`
      checks.push({
        name: "Авторизация Digiseller (/api/apilogin)",
        ok: false,
        message: `❌ Код ${code}${desc ? `: ${desc}` : ""}\n💡 ${hint}`,
        detail: `HTTP ${res.status} · ${duration}ms · seller_id: ${sellerIdInt} · key_len: ${apiKey.length}`,
        duration,
        raw: data,
      })
      return NextResponse.json({ ok: false, checks })
    }
  } catch (err) {
    const duration = Date.now() - authStart
    const msg = axios.isAxiosError(err)
      ? err.code === "ECONNABORTED" ? "Таймаут (>15с)"
      : err.code === "ENOTFOUND"   ? "DNS не разрешается — проверьте интернет на сервере"
      : `HTTP ${err.response?.status ?? "нет ответа"}`
      : String(err)
    checks.push({ name: "Авторизация Digiseller", ok: false, message: msg, duration })
    return NextResponse.json({ ok: false, checks })
  }

  // ── 5. Catalog check ──────────────────────────────────────────────────────
  const catStart = Date.now()
  try {
    const res = await axios.post(
      "https://api.digiseller.ru/api/seller-goods",
      { seller_id: sellerIdInt, token, page: 1, rows: 5, order: "date", direction: "desc" },
      { headers: { Accept: "application/json", "Content-Type": "application/json" }, timeout: 20000, validateStatus: () => true },
    )
    const duration = Date.now() - catStart
    const data = res.data
    if (Array.isArray(data?.rows)) {
      checks.push({
        name: "Каталог товаров (/api/seller-goods)",
        ok: true,
        message: `✅ ${data.rows.length} товаров · Всего: ${data.count ?? "?"} · Страниц: ${data.pages ?? "?"}`,
        detail: data.rows.slice(0, 3).map((r: { id_goods: number; name_goods: string }) => `[${r.id_goods}] ${String(r.name_goods).slice(0, 50)}`).join("\n"),
        duration,
      })
    } else {
      checks.push({
        name: "Каталог товаров (/api/seller-goods)",
        ok: false,
        message: `❌ Код ${data?.retval ?? "?"}: ${data?.retdesc ?? "Неожиданный ответ"}`,
        detail: JSON.stringify(data).slice(0, 300),
        duration,
        raw: data,
      })
      return NextResponse.json({ ok: false, checks })
    }
  } catch (err) {
    checks.push({ name: "Каталог товаров", ok: false, message: String(err), duration: Date.now() - catStart })
    return NextResponse.json({ ok: false, checks })
  }

  checks.push({ name: "Итог", ok: true, message: "✅ Все проверки пройдены. Можно запускать импорт." })
  return NextResponse.json({ ok: true, checks })
}