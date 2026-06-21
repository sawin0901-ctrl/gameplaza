import axios from "axios"
import * as cheerio from "cheerio"
import crypto from "crypto"
import { logError } from "./system-logger"

const BASE_URL = "https://api.digiseller.ru/api"

// ── Credentials ───────────────────────────────────────────────────────────────
function getCredentials() {
  // .trim() is critical — .env values often have trailing newline/spaces
  const sellerId = (process.env.DIGISELLER_SELLER_ID ?? "").trim()
  const apiKey   = (process.env.DIGISELLER_API_KEY   ?? "").trim()

  if (!sellerId || sellerId === "your-seller-id") {
    throw new Error("DIGISELLER_SELLER_ID не задан в .env файле")
  }
  if (!apiKey || apiKey === "your-api-key") {
    throw new Error("DIGISELLER_API_KEY не задан в .env файле")
  }
  return { sellerId, apiKey }
}

// ── Token cache ───────────────────────────────────────────────────────────────
let _cachedToken: string | null = null
let _tokenExpiry = 0
let _tokenSellerId: string | null = null

export function clearTokenCache() {
  _cachedToken = null
  _tokenExpiry = 0
}

export async function getDigisellerToken(): Promise<string> {
  const { sellerId, apiKey } = getCredentials()

  if (_cachedToken && Date.now() < _tokenExpiry && _tokenSellerId === sellerId) {
    return _cachedToken
  }

  // Digiseller requires timestamp in body so it can verify MD5(apikey + timestamp)
  const timestamp = Math.floor(Date.now() / 1000)
  const sign = crypto.createHash("md5").update(apiKey + timestamp).digest("hex")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let res: any
  try {
    res = await axios.post(
      `${BASE_URL}/apilogin`,
      {
        seller_id: parseInt(sellerId, 10),
        apikey: apiKey,
        sign,
        timestamp,   // Must include timestamp so Digiseller can verify MD5(apikey+timestamp)
        lang: "ru-RU",
      },
      {
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        timeout: 15000,
      },
    )
  } catch (err) {
    _cachedToken = null
    _tokenExpiry = 0
    if (axios.isAxiosError(err)) {
      if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
        throw new Error("Таймаут авторизации Digiseller (>15с)")
      }
      if (err.response) {
        const detail = JSON.stringify(err.response.data).slice(0, 400)
        throw new Error(`Ошибка авторизации Digiseller HTTP ${err.response.status}: ${detail}`)
      }
      throw new Error(`Нет соединения с api.digiseller.ru: ${err.message}`)
    }
    throw err
  }

  if (!res.data || res.data.retval !== 0) {
    const code = res.data?.retval ?? "?"
    const desc = res.data?.retdesc ?? "нет описания"
    const hint = getHintForCode(code)
    throw new Error(
      `Ошибка авторизации Digiseller (код ${code}): ${desc}.\n${hint}`
    )
  }

  _cachedToken = res.data.token as string
  _tokenSellerId = sellerId
  _tokenExpiry = Date.now() + 50 * 60 * 1000
  return _cachedToken
}

function getHintForCode(code: number | string): string {
  switch (Number(code)) {
    case -1:  return "API ключ не совпадает с Seller ID, или ключ не активирован.\n" +
                     "1. Войдите на my.digiseller.com → Настройки → API\n" +
                     "2. Скопируйте API-ключ заново (полностью, без пробелов)\n" +
                     "3. Убедитесь что DIGISELLER_SELLER_ID = ваш числовой ID продавца\n" +
                     "4. Проверьте: cat /var/www/gameplaza/.env | grep DIGISELLER"
    case -2:  return "Неверный формат параметров. DIGISELLER_SELLER_ID должен быть числом."
    case -3:  return "Продавец не найден. Проверьте DIGISELLER_SELLER_ID — это числовой ID из URL вашего магазина."
    case -4:  return "Неверная подпись (MD5). Скопируйте DIGISELLER_API_KEY заново — вероятно невидимые символы."
    case -5:  return "Дублирующийся timestamp. Подождите секунду и повторите."
    case -7:  return "Доступ запрещён. Проверьте права API-ключа в кабинете Digiseller."
    case -10: return "API ключ заблокирован. Создайте новый ключ в кабинете Digiseller."
    default:  return "Неизвестная ошибка. Проверьте DIGISELLER_API_KEY и DIGISELLER_SELLER_ID в .env файле."
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface DigisellerProduct {
  id_goods: number
  name_goods: string
  info_goods: string
  price_usd: number
  price_rub: number
  old_price_rub?: number
  currency: string
  image_link?: string
  cnt_goods: number
  status: number
  categories: number[]
}

export interface DigisellerProductList {
  rows: DigisellerProduct[]
  count: number
  pages: number
}

// ── Seller catalog (POST, session token required) ─────────────────────────────
export async function getDigisellerProducts(page = 1, pageSize = 20): Promise<DigisellerProductList> {
  const { sellerId } = getCredentials()
  const token = await getDigisellerToken()

  const requestBody = {
    seller_id: parseInt(sellerId, 10),
    token,
    page,
    rows: pageSize,
    order: "date",
    direction: "desc",
  }

  try {
    const res = await axios.post(`${BASE_URL}/seller-goods`, requestBody, {
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      timeout: 20000,
    })

    if (!res.data || typeof res.data !== "object") {
      throw new Error("Digiseller вернул пустой или некорректный ответ")
    }

    if (res.data.retval !== undefined && res.data.retval !== 0) {
      const hint = getHintForCode(res.data.retval)
      throw new Error(`Digiseller API ошибка: ${res.data.retdesc ?? `код ${res.data.retval}`}. ${hint}`)
    }

    if (!Array.isArray(res.data.rows)) {
      const rows = res.data.goods ?? res.data.products ?? res.data.items
      if (Array.isArray(rows)) return { rows, count: rows.length, pages: 1 }
      throw new Error(
        `Не удалось найти список товаров в ответе. Ответ: ${JSON.stringify(res.data).slice(0, 300)}`,
      )
    }

    return res.data as DigisellerProductList
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        clearTokenCache()
        logError("digiseller", "Digiseller: token expired", { status: err.response.status }).catch(() => {})
        throw new Error("Токен Digiseller истёк. Повторите попытку.")
      }
      if (err.response?.status === 405) {
        throw new Error("Digiseller API: метод 405. Обратитесь к разработчику.")
      }
      if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
        throw new Error("Таймаут запроса к Digiseller API (>20с).")
      }
      if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") {
        logError("digiseller", "Cannot connect to api.digiseller.ru", { code: err.code }).catch(() => {})
        throw new Error("Нет соединения с api.digiseller.ru. Проверьте интернет на сервере.")
      }
      if (err.response?.status === 429) {
        throw new Error("Превышен лимит запросов к Digiseller API. Подождите минуту.")
      }
      if (err.response) {
        const detail = JSON.stringify(err.response.data).slice(0, 200)
        logError("digiseller", `Digiseller seller-goods HTTP ${err.response.status}`, err.response.data).catch(() => {})
        throw new Error(`Digiseller API вернул ошибку ${err.response.status}: ${detail}`)
      }
      throw new Error(`Ошибка сети: ${err.message}`)
    }
    throw err
  }
}

// ── Single product ─────────────────────────────────────────────────────────────
export async function getDigisellerProduct(productId: number): Promise<DigisellerProduct | null> {
  const { sellerId } = getCredentials()

  try {
    const res = await axios.get(`${BASE_URL}/goods/${productId}`, {
      params: { seller_id: sellerId, lang: "ru", currency: "RUB" },
      headers: { Accept: "application/json" },
      timeout: 12000,
    })
    const g = res.data?.goods_info || res.data?.product
    if (g && (g.name || g.name_goods)) {
      return {
        id_goods: g.id || g.id_goods || productId,
        name_goods: g.name || g.name_goods,
        info_goods: g.info || g.info_goods || "",
        price_usd: g.price_usd || 0,
        price_rub: g.price_rub || g.price || 0,
        old_price_rub: g.price_rub_old || g.old_price || undefined,
        currency: "RUB",
        image_link: g.images?.[0]?.url || g.image_link || undefined,
        cnt_goods: g.cnt_in ?? g.cnt_goods ?? 999,
        status: g.status ?? 1,
        categories: g.categories || [],
      }
    }
  } catch {}

  try {
    const token = await getDigisellerToken()
    const res = await axios.post(
      `${BASE_URL}/products/info`,
      { product_id: productId, seller_id: parseInt(sellerId, 10), token },
      { headers: { Accept: "application/json", "Content-Type": "application/json" }, timeout: 10000 },
    )
    if (res.data?.product) return res.data.product
  } catch {}

  return scrapePlatiMarket(productId)
}

async function scrapePlatiMarket(productId: number): Promise<DigisellerProduct | null> {
  try {
    const { data } = await axios.get(`https://plati.market/itm/${productId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ru-RU,ru;q=0.9",
      },
      timeout: 20000,
    })
    const $ = cheerio.load(data)

    const name =
      $("h1.page-title").first().text().trim() ||
      $("h1[itemprop='name']").first().text().trim() ||
      $("h1").first().text().trim()

    if (!name) return null

    const priceStr =
      $("[itemprop='price']").first().attr("content") ||
      $(".price-buy-block .val").first().text().replace(/[^\d.]/g, "") ||
      $(".buy-btn .price").first().text().replace(/[^\d.]/g, "")
    const price = parseFloat(priceStr) || 0

    const oldPriceStr =
      $(".price-old .val").first().text().replace(/[^\d.]/g, "") ||
      $("del .val").first().text().replace(/[^\d.]/g, "")
    const oldPrice = parseFloat(oldPriceStr) || undefined

    const desc =
      $(".goods-description-main").first().text().trim() ||
      $("[itemprop='description']").first().text().trim()

    const imgSrc =
      $("img[itemprop='image']").first().attr("src") ||
      $("img.goods-img").first().attr("src")
    const imageUrl = imgSrc
      ? imgSrc.startsWith("http") ? imgSrc : `https://plati.market${imgSrc}`
      : undefined

    return {
      id_goods: productId,
      name_goods: name,
      info_goods: desc,
      price_usd: 0,
      price_rub: price,
      old_price_rub: oldPrice && oldPrice > price ? oldPrice : undefined,
      currency: "RUB",
      image_link: imageUrl,
      cnt_goods: 999,
      status: 1,
      categories: [],
    }
  } catch {
    return null
  }
}

export async function checkProductAvailability(productId: number): Promise<boolean> {
  try {
    const product = await getDigisellerProduct(productId)
    return (product?.cnt_goods ?? 0) > 0 && product?.status === 1
  } catch {
    return false
  }
}
