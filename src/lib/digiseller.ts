import axios from "axios"
import * as cheerio from "cheerio"

const BASE_URL = "https://api.digiseller.ru/api"

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

export async function getDigisellerProducts(page = 1, pageSize = 20): Promise<DigisellerProductList> {
  const { sellerId, apiKey } = getCredentials()

  try {
    const res = await axios.get(`${BASE_URL}/seller-goods`, {
      params: {
        seller_id: sellerId,
        token: apiKey,
        page,
        rows: pageSize,
        order: "date",
        direction: "desc",
      },
      headers: { Accept: "application/json" },
      timeout: 20000,
    })

    if (!res.data || typeof res.data !== "object") {
      throw new Error("Digiseller вернул пустой или некорректный ответ")
    }

    // API может вернуть ошибку в теле с кодом 200
    if (res.data.retval !== undefined && res.data.retval !== 0) {
      throw new Error(`Digiseller API ошибка: ${res.data.retdesc ?? `код ${res.data.retval}`}`)
    }

    if (!Array.isArray(res.data.rows)) {
      // Пробуем альтернативный ключ
      const rows = res.data.goods ?? res.data.products ?? res.data.items
      if (Array.isArray(rows)) return { rows, count: rows.length, pages: 1 }
      throw new Error(`Не удалось найти список товаров в ответе Digiseller. Ответ: ${JSON.stringify(res.data).slice(0, 300)}`)
    }

    return res.data as DigisellerProductList
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
        throw new Error("Таймаут запроса к Digiseller API (>20с). Сервер Digiseller не отвечает.")
      }
      if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") {
        throw new Error("Нет соединения с api.digiseller.ru. Проверьте интернет-соединение на сервере.")
      }
      if (err.response?.status === 401 || err.response?.status === 403) {
        throw new Error("Неверный токен Digiseller API. Проверьте DIGISELLER_SELLER_ID и DIGISELLER_API_KEY в файле .env")
      }
      if (err.response?.status === 429) {
        throw new Error("Превышен лимит запросов к Digiseller API. Подождите несколько минут и повторите.")
      }
      if (err.response) {
        throw new Error(`Digiseller API вернул ошибку ${err.response.status}: ${JSON.stringify(err.response.data).slice(0, 200)}`)
      }
      if (!err.response) {
        throw new Error(`Ошибка сети при запросе к Digiseller API: ${err.message}`)
      }
    }
    throw err
  }
}

export async function getDigisellerProduct(productId: number): Promise<DigisellerProduct | null> {
  const { sellerId } = getCredentials()

  // 1. Public goods endpoint
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

  // 2. Seller products info
  try {
    const { apiKey } = getCredentials()
    const res = await axios.get(`${BASE_URL}/products/info`, {
      params: { product_id: productId, seller_id: sellerId, token: apiKey },
      headers: { Accept: "application/json" },
      timeout: 10000,
    })
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
      $(".old-price").first().text().replace(/[^\d.]/g, "") ||
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
