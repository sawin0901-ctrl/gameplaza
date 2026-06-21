import axios from "axios"
import * as cheerio from "cheerio"
import crypto from "crypto"
import { logError } from "./system-logger"

const BASE_URL = "https://api.digiseller.com/api"

function getCredentials() {
  const sellerId = (process.env.DIGISELLER_SELLER_ID ?? "").trim()
  const apiKey   = (process.env.DIGISELLER_API_KEY   ?? "").trim()
  if (!sellerId || sellerId === "your-seller-id") throw new Error("DIGISELLER_SELLER_ID не задан в .env файле")
  if (!apiKey || apiKey === "your-api-key") throw new Error("DIGISELLER_API_KEY не задан в .env файле")
  return { sellerId, apiKey }
}

let _cachedToken: string | null = null
let _tokenExpiry = 0
let _tokenSellerId: string | null = null

export function clearTokenCache() { _cachedToken = null; _tokenExpiry = 0 }

export async function getDigisellerToken(): Promise<string> {
  const { sellerId, apiKey } = getCredentials()
  if (_cachedToken && Date.now() < _tokenExpiry && _tokenSellerId === sellerId) return _cachedToken

  // sign = SHA256(apikey + timestamp) — api.digiseller.com docs
  const timestamp = Math.floor(Date.now() / 1000)
  const sign = crypto.createHash("sha256").update(apiKey + String(timestamp)).digest("hex")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let res: any
  try {
    res = await axios.post(
      `${BASE_URL}/apilogin`,
      { seller_id: parseInt(sellerId, 10), timestamp, sign },
      { headers: { Accept: "application/json", "Content-Type": "application/json" }, timeout: 15000 },
    )
  } catch (err) {
    _cachedToken = null; _tokenExpiry = 0
    if (axios.isAxiosError(err)) {
      if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") throw new Error("Таймаут авторизации Digiseller (>15с)")
      if (err.response) throw new Error(`Ошибка авторизации Digiseller HTTP ${err.response.status}: ${JSON.stringify(err.response.data).slice(0, 400)}`)
      throw new Error(`Нет соединения с api.digiseller.com: ${err.message}`)
    }
    throw err
  }

  if (!res.data || res.data.retval !== 0) {
    const code = res.data?.retval ?? "?"
    const desc = res.data?.desc ?? res.data?.retdesc ?? "нет описания"
    const hint = getHintForCode(code)
    throw new Error(`Ошибка авторизации Digiseller (код ${code}): ${desc}.\n${hint}`)
  }

  _cachedToken = res.data.token as string
  _tokenSellerId = sellerId
  _tokenExpiry = Date.now() + 50 * 60 * 1000
  return _cachedToken
}

function getHintForCode(code: number | string): string {
  switch (Number(code)) {
    case -1: return "Неверный логин или подпись. Проверьте DIGISELLER_API_KEY и DIGISELLER_SELLER_ID."
    case -2: return "Аккаунт временно заблокирован."
    case -3: return "Ошибка в процессе выполнения."
    case -4: return "Нарушена уникальность timestamp. Подождите секунду и повторите."
    default: return "Проверьте DIGISELLER_API_KEY и DIGISELLER_SELLER_ID в .env файле."
  }
}

export interface DigisellerProduct {
  id_goods: number; name_goods: string; info_goods: string; price_usd: number
  price_rub: number; old_price_rub?: number; currency: string; image_link?: string
  cnt_goods: number; status: number; categories: number[]
}
export interface DigisellerProductList { rows: DigisellerProduct[]; count: number; pages: number }

export async function getDigisellerProducts(page = 1, pageSize = 20): Promise<DigisellerProductList> {
  const { sellerId } = getCredentials()
  const token = await getDigisellerToken()
  try {
    // seller-goods uses id_seller (not seller_id), order_col/order_dir (not order/direction)
    // token goes in both body and query string per Digiseller docs
    const res = await axios.post(
      `${BASE_URL}/seller-goods?token=${encodeURIComponent(token)}`,
      {
        id_seller: parseInt(sellerId, 10),
        order_col: "name",
        order_dir: "asc",
        rows: pageSize,
        page,
        currency: "RUR",
        lang: "ru-RU",
        show_hidden: 0,
      },
      { headers: { Accept: "application/json", "Content-Type": "application/json" }, timeout: 20000 },
    )

    if (!res.data || typeof res.data !== "object") throw new Error("Digiseller вернул пустой или некорректный ответ")
    if (res.data.retval !== undefined && res.data.retval !== 0) {
      throw new Error(`Digiseller API ошибка: ${res.data.retdesc ?? `код ${res.data.retval}`}`)
    }
    if (!Array.isArray(res.data.rows)) {
      throw new Error(`Не удалось найти список товаров. Ответ: ${JSON.stringify(res.data).slice(0, 300)}`)
    }

    // Map API fields to our DigisellerProduct type
    // API returns price_rur (not price_rub), in_stock (not status), image via graph.digiseller.ru
    const rows: DigisellerProduct[] = (res.data.rows as Record<string, unknown>[]).map(r => ({
      id_goods:    Number(r.id_goods),
      name_goods:  String(r.name_goods ?? ""),
      info_goods:  String(r.info_goods ?? ""),
      price_usd:   Number(r.price_usd ?? 0),
      price_rub:   Number(r.price_rur ?? 0),
      old_price_rub: (() => {
        const si = r.sale_info as Record<string, unknown> | null
        const v = Number(si?.common_price_rur ?? 0)
        return v > 0 ? v : undefined
      })(),
      currency:    "RUR",
      image_link:  `https://graph.digiseller.ru/img.ashx?id_d=${r.id_goods}&maxlength=400`,
      cnt_goods:   Number(r.num_in_stock ?? 999),
      status:      Number(r.in_stock ?? 1),
      categories:  [],
    }))

    return { rows, count: res.data.cnt_goods ?? rows.length, pages: res.data.pages ?? 1 }
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        clearTokenCache()
        logError("digiseller", "Digiseller: token expired", { status: err.response.status }).catch(() => {})
        throw new Error("Токен Digiseller истёк. Повторите попытку.")
      }
      if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") throw new Error("Таймаут запроса к Digiseller API (>20с).")
      if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") {
        logError("digiseller", "Cannot connect to api.digiseller.com", { code: err.code }).catch(() => {})
        throw new Error("Нет соединения с api.digiseller.com. Проверьте интернет на сервере.")
      }
      if (err.response?.status === 429) throw new Error("Превышен лимит запросов к Digiseller API. Подождите минуту.")
      if (err.response) {
        logError("digiseller", `Digiseller seller-goods HTTP ${err.response.status}`, err.response.data).catch(() => {})
        throw new Error(`Digiseller API вернул ошибку ${err.response.status}: ${JSON.stringify(err.response.data).slice(0, 200)}`)
      }
      throw new Error(`Ошибка сети: ${err.message}`)
    }
    throw err
  }
}

export async function getDigisellerProduct(productId: number): Promise<DigisellerProduct | null> {
  const { sellerId } = getCredentials()
  try {
    // GET /api/products/{id}/data — single product details
    const token = await getDigisellerToken()
    const res = await axios.get(`${BASE_URL}/products/${productId}/data`, {
      params: { seller_id: parseInt(sellerId, 10), token, currency: "RUB", lang: "ru-RU" },
      headers: { Accept: "application/json" },
      timeout: 12000,
    })
    const p = res.data?.product
    if (p && (p.name || p.name_goods)) {
      return {
        id_goods:     p.id || productId,
        name_goods:   p.name || "",
        info_goods:   p.info || "",
        price_usd:    p.prices?.default?.USD ?? 0,
        price_rub:    p.prices?.default?.RUB ?? p.price_rub ?? p.price_rur ?? p.price ?? 0,
        old_price_rub: p.sale_info?.common_price_rub && Number(p.sale_info.common_price_rub) > 0
          ? Number(p.sale_info.common_price_rub) : undefined,
        currency:     "RUB",
        image_link:   p.preview_imgs?.[0]?.url ?? `https://graph.digiseller.ru/img.ashx?id_d=${productId}&maxlength=400`,
        cnt_goods:    p.num_in_stock ?? 999,
        status:       p.is_available ?? 1,
        categories:   p.category_id ? [p.category_id] : [],
      }
    }
  } catch {}
  return scrapePlatiMarket(productId)
}

async function scrapePlatiMarket(productId: number): Promise<DigisellerProduct | null> {
  try {
    const { data } = await axios.get(`https://plati.market/itm/${productId}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36", "Accept-Language": "ru-RU,ru;q=0.9" },
      timeout: 20000,
    })
    const $ = cheerio.load(data)
    const name = $("h1.page-title").first().text().trim() || $("h1[itemprop='name']").first().text().trim() || $("h1").first().text().trim()
    if (!name) return null
    const priceStr = $("[itemprop='price']").first().attr("content") || $(".price-buy-block .val").first().text().replace(/[^\d.]/g, "") || $(".buy-btn .price").first().text().replace(/[^\d.]/g, "")
    const price = parseFloat(priceStr) || 0
    const oldPriceStr = $(".price-old .val").first().text().replace(/[^\d.]/g, "") || $("del .val").first().text().replace(/[^\d.]/g, "")
    const oldPrice = parseFloat(oldPriceStr) || undefined
    const desc = $(".goods-description-main").first().text().trim() || $("[itemprop='description']").first().text().trim()
    const imgSrc = $("img[itemprop='image']").first().attr("src") || $("img.goods-img").first().attr("src")
    const imageUrl = imgSrc ? (imgSrc.startsWith("http") ? imgSrc : `https://plati.market${imgSrc}`) : `https://graph.digiseller.ru/img.ashx?id_d=${productId}&maxlength=400`
    return { id_goods: productId, name_goods: name, info_goods: desc, price_usd: 0, price_rub: price,
      old_price_rub: oldPrice && oldPrice > price ? oldPrice : undefined, currency: "RUB",
      image_link: imageUrl, cnt_goods: 999, status: 1, categories: [] }
  } catch { return null }
}

export async function getProductPublicPrice(productId: number): Promise<number> {
  try {
    const res = await axios.get(${BASE_URL}/products//info, {
      params: { currency: "RUB", lang: "ru-RU" },
      headers: { Accept: "application/json" },
      timeout: 8000,
    })
    const d = res.data
    const price = d?.prices?.price ?? d?.price?.price ?? d?.price ?? d?.product?.price ?? 0
    return Number(price) || 0
  } catch { return 0 }
}

export async function checkProductAvailability(productId: number): Promise<boolean> {
  try { const product = await getDigisellerProduct(productId); return (product?.cnt_goods ?? 0) > 0 && product?.status === 1 }
  catch { return false }
}
