import axios from "axios"
import * as cheerio from "cheerio"
import crypto from "crypto"
import { logError } from "./system-logger"

const BASE_URL = "https://api.digiseller.ru/api"

// ── Credentials ───────────────────────────────────────────────────────────────
function getCredentials() {
  const sellerId = process.env.DIGISELLER_SELLER_ID
  const apiKey = process.env.DIGISELLER_API_KEY
  if (!sellerId || sellerId === "your-seller-id") {
    throw new Error("DIGISELLER_SELLER_ID не задан в .env файле")
  }
  if (!apiKey || apiKey === "your-api-key") {
    throw new Error("DIGISELLER_API_KEY не задан в .env файле")
  }
  return { sellerId, apiKey }
}

// ── Token cache ───────────────────────────────────────────────────────────────
// Digiseller session tokens expire after ~1 hour; we refresh at 50 min
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

  const timestamp = Math.floor(Date.now() / 1000)
  const sign = crypto.createHash("md5").update(apiKey + timestamp).digest("hex")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let res: any
  try {
    res = await axios.post(
      `${BASE_URL}/apilogin`,
      { seller_id: parseInt(sellerId, 10), apikey: apiKey, sign, lang: "ru-RU" },
      { headers: { Accept: "application/json", "Content-Type": "application/json" }, timeout: 15000 },
    )
  } catch (err) {
    _cachedToken = null
    _tokenExpiry = 0
    if (axios.isAxiosError(err)) {
      if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
        throw new Error("Таймаут авторизации Digiseller (>15с)")
      }
      if (err.response) {
        throw new Error(`Ошибка авторизации Digiseller (HTTP ${err.response.status}): ${JSON.stringify(err.response.data).slice(0, 300)}`)
      }
      throw new Error(`Нет соединения с api.digiseller.ru при авторизации: ${err.message}`)
    }
    throw err
  }

  if (!res.data || res.data.retval !== 0) {
    const desc = res.data?.retdesc ?? "неизвестная ошибка"
    const code = res.data?.retval
    throw new Error(`Ошибка авторизации Digiseller: ${desc} (код ${code}). Проверьте DIGISELLER_API_KEY в .env`)
  }

  _cachedToken = res.data.token as string
  _tokenSellerId = sellerId
  _tokenExpiry = Date.now() + 50 * 60 * 1000 // 50 минут
  return _cachedToken
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
      throw new Error(`Digiseller API ошибка: ${res.data.retdesc ?? `код ${res.data.retval}`}`)
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
      // Token may have expired — clear cache so next call re-authenticates
      if (err.response?.status === 401 || err.response?.status === 403) {
        clearTokenCache()
        logError("digiseller", "Digiseller: token expired or invalid", { status: err.response.status }).catch(() => {})
        throw new Error("Токен Digiseller истёк или недействителен. Повторите попытку.")
      }
      if (err.response?.status === 405) {
        throw new Error("Digiseller API: метод запроса не поддерживается (405). Обратитесь к разработчику.")
      }
      if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
        throw new Error("Таймаут запроса к Digiseller API (>20с). Сервер Digiseller не отвечает.")
      }
      if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") {
        logError("digiseller", "Cannot connect to api.digiseller.ru", { code: err.code }).catch(() => {})
        throw new Error("Нет соединения с api.digiseller.ru. Проверьте интернет-соединение на сервере.")
      }
      if (err.response?.status === 429) {
        logError("digiseller", "Digiseller rate limit exceeded", { status: 429 }).catch(() => {})
        throw new Error("Превышен лимит запросов к Digiseller API. Подождите несколько минут и повторите.")
      }
      if (err.response) {
        const detail = JSON.stringify(err.response.data).slice(0, 200)
        logError("digiseller", `Digiseller seller-goods HTTP ${err.response.status}`, err.response.data).catch(() => {})
        throw new Error(`Digiseller API вернул ошибку ${err.response.status}: ${detail}`)
      }
      logError("digiseller", "Digiseller network error", { message: err.message }).catch(() => {})
      throw new Error(`Ошибка сети при запросе к Digiseller API: ${err.message}`)
    }
    throw err
  }
}

// ── Single product ─────────────────────────────────────────────────────────────
export async function getDigisellerProduct(productId: number): Promise<DigisellerProduct | null> {
  const { sellerId } = getCredentials()

  // 1. Public goods info (GET — no auth needed, public endpoint)
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

  // 2. Authenticated product info (POST with session token)
  try {
    const token = await getDigisellerToken()
    const res = await axios.post(
      `${BASE_URL}/products/info`,
      { product_id: productId, seller_id: parseInt(sellerId, 10), token },
      { headers: { Accept: "application/json", "Content-Type": "application/json" }, timeout: 10000 },
    )
    if (res.data?.product) return res.data.product
  } catch {}

  // 3. Fallback: scrape plati.market
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
      $("del .val").first().text().replace(/[^\d.]/g, "") ||
      $("[class*='old-price']").first().text().replace(/[^\d.]/g, "")
    const oldPrice = parseFloat(oldPriceStr) || undefined

    const desc =
      $(".goods-description-main").first().text().trim() ||
      $("[itemprop='description']").first().text().trim() ||
      $(".description").first().text().trim()

    const imgSrc =
      $("img[itemprop='image']").first().attr("src") ||
      $("img.goods-img").first().attr("src") ||
      $(".goods-img img").first().attr("src")
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
