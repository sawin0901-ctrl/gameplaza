import axios from "axios"
import * as cheerio from "cheerio"

const BASE_URL = "https://api.digiseller.ru/api"
const SELLER_ID = process.env.DIGISELLER_SELLER_ID!
const API_KEY = process.env.DIGISELLER_API_KEY!

export interface DigisellerProduct {
  id_goods: number
  name_goods: string
  info_goods: string
  price_usd: number
  price_rub: number
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
  const res = await axios.get(`${BASE_URL}/seller-goods`, {
    params: {
      seller_id: SELLER_ID,
      token: API_KEY,
      page,
      rows: pageSize,
      order: "date",
      direction: "desc",
    },
    headers: { Accept: "application/json" },
    timeout: 15000,
  })
  return res.data
}

export async function getDigisellerProduct(productId: number): Promise<DigisellerProduct | null> {
  // 1. Try public goods endpoint (works for any product, not just own)
  try {
    const res = await axios.get(`${BASE_URL}/goods/${productId}`, {
      params: { seller_id: SELLER_ID, lang: "ru", currency: "RUB" },
      headers: { Accept: "application/json" },
      timeout: 10000,
    })
    const g = res.data?.goods_info || res.data?.product
    if (g && (g.name || g.name_goods)) {
      return {
        id_goods: g.id || g.id_goods || productId,
        name_goods: g.name || g.name_goods,
        info_goods: g.info || g.info_goods || "",
        price_usd: g.price_usd || 0,
        price_rub: g.price_rub || g.price || 0,
        currency: "RUB",
        image_link: g.images?.[0]?.url || g.image_link || undefined,
        cnt_goods: g.cnt_in ?? g.cnt_goods ?? 999,
        status: g.status ?? 1,
        categories: g.categories || [],
      }
    }
  } catch {}

  // 2. Try seller products info endpoint
  try {
    const res = await axios.get(`${BASE_URL}/products/info`, {
      params: { product_id: productId, seller_id: SELLER_ID },
      headers: { Accept: "application/json" },
      timeout: 10000,
    })
    if (res.data?.product) return res.data.product
  } catch {}

  // 3. Scrape plati.market directly (works for affiliate/partner products)
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

    const soldText = $("[data-count]").first().attr("data-count") ||
      $(".sold-count").first().text().replace(/[^\d]/g, "")
    const soldCount = parseInt(soldText || "0") || 0

    return {
      id_goods: productId,
      name_goods: name,
      info_goods: desc,
      price_usd: 0,
      price_rub: price,
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
