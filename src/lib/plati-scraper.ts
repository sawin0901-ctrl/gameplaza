import axios from "axios"
import * as cheerio from "cheerio"

export interface PlatiProduct {
  id: number
  url: string
  name: string
  shortDesc: string
  description: string
  price: number
  oldPrice?: number
  currency: string
  imageUrl: string
  galleryImages: string[]
  videoUrl?: string
  category: string
  subcategory?: string
  platform?: string
  inStock: boolean
  quantity: number
  rating?: number
  reviewCount?: number
  metaTitle: string
  metaDescription: string
  metaKeywords: string
}

const CATEGORY_RULES: { keywords: string[]; category: string; platform?: string }[] = [
  { keywords: ["steam", "стим"], category: "steam", platform: "PC" },
  { keywords: ["xbox", "game pass", "gamepass", "xbox live", "xbox one", "xbox series"], category: "xbox", platform: "Xbox" },
  { keywords: ["playstation", "ps4", "ps5", "ps plus", "psn", "ps store", "плейстейшн"], category: "playstation", platform: "PlayStation" },
  { keywords: ["nintendo", "нинтендо", "switch", "eshop"], category: "nintendo", platform: "Nintendo" },
  { keywords: ["origin", "ea play", "ea app", "ea fc"], category: "origin", platform: "PC" },
  { keywords: ["ubisoft", "uplay"], category: "ubisoft", platform: "PC" },
  { keywords: ["подписк", "subscription", "apple arcade"], category: "subscriptions" },
  { keywords: ["gift card", "подарочн", "gift", "пополнен", "баланс"], category: "gift-cards" },
]

function detectCategory(name: string, desc: string): { category: string; platform?: string } {
  const text = (name + " " + desc).toLowerCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => text.includes(kw))) return { category: rule.category, platform: rule.platform }
  }
  return { category: "keys" }
}

function toAbs(src: string | undefined): string {
  if (!src) return ""
  if (src.startsWith("http")) return src
  if (src.startsWith("//")) return "https:" + src
  return "https://plati.market" + (src.startsWith("/") ? "" : "/") + src
}

function makeSeo(name: string, desc: string, category: string) {
  const clean = desc.replace(/\s+/g, " ").trim()
  return {
    title: (name + " — купить ключ | GamePlaza").slice(0, 70),
    description: clean.length > 155 ? clean.slice(0, 152) + "..." : (clean || "Купить " + name + " по низкой цене в GamePlaza"),
    keywords: [name, "купить", category, "ключ активации", "GamePlaza"].join(", "),
  }
}

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Referer": "https://plati.market/",
}

export async function scrapePlatiProduct(productId: number): Promise<PlatiProduct | null> {
  const url = `https://plati.market/itm/${productId}`
  try {
    const { data } = await axios.get(url, { headers: BROWSER_HEADERS, timeout: 30000 })
    const $ = cheerio.load(data)

    const name = (
      $("h1[itemprop='name']").first().text().trim() ||
      $("h1.page-title").first().text().trim() ||
      $(".goods-title h1").first().text().trim() ||
      $("h1").first().text().trim()
    )
    if (!name) return null

    const priceAttr = $("[itemprop='price']").first().attr("content")
    const priceText = $(".price-buy .val, .buy-btn .price, .price-value").first().text().replace(/[^\d.,]/g, "").replace(",", ".")
    const price = parseFloat(priceAttr ?? priceText) || 0

    const oldPriceText = $(".price-old .val, del .val, .price-old").first().text().replace(/[^\d.,]/g, "").replace(",", ".")
    const oldPrice = parseFloat(oldPriceText) || undefined

    const currency = $("[itemprop='priceCurrency']").first().attr("content") ?? "RUB"

    const description = (
      $(".goods-description-main").first().text().trim() ||
      $("[itemprop='description']").first().text().trim() ||
      $(".goods-description").first().text().trim()
    )
    const shortDesc = description.replace(/\s+/g, " ").slice(0, 300).trim()

    const mainImgSrc = (
      $("img[itemprop='image']").first().attr("src") ||
      $(".goods-img-large img").first().attr("src") ||
      $(".product-image img").first().attr("src") ||
      $("img.goods-img").first().attr("src")
    )
    const imageUrl = mainImgSrc
      ? toAbs(mainImgSrc)
      : `https://graph.digiseller.ru/img.ashx?id_d=${productId}&maxlength=400`

    const seen = new Set<string>([imageUrl])
    const galleryImages: string[] = []
    $(".product-images img, .goods-gallery img, .gallery-thumb img").each((_, el) => {
      const src = toAbs($(el).attr("src") ?? $(el).attr("data-src") ?? "")
      if (src && src.startsWith("http") && !seen.has(src)) { seen.add(src); galleryImages.push(src) }
    })

    const videoSrc = $("iframe[src*='youtube'], iframe[src*='youtu.be']").first().attr("src")
    const videoUrl = videoSrc ?? undefined

    const availHref = $("[itemprop='availability']").first().attr("href") ?? ""
    const stockText = $(".goods-status, .stock-status").first().text().toLowerCase()
    const inStock = availHref.includes("InStock") ||
      (!stockText.includes("нет") && !stockText.includes("отсутств"))

    const ratingVal = $("[itemprop='ratingValue']").first().attr("content") ?? ""
    const rating = parseFloat(ratingVal) || undefined
    const reviewsVal = $("[itemprop='reviewCount']").first().attr("content") ?? ""
    const reviewCount = parseInt(reviewsVal) || undefined

    const { category, platform } = detectCategory(name, description)
    const crumbs: string[] = []
    $(".breadcrumbs li a, nav[aria-label='breadcrumb'] a").each((_, el) => {
      const t = $(el).text().trim()
      if (t && t !== "Главная" && t !== "Plati.market") crumbs.push(t)
    })
    const subcategory = crumbs.length > 0 ? crumbs[crumbs.length - 1] : undefined

    const seo = makeSeo(name, description, category)
    return {
      id: productId, url, name, shortDesc, description,
      price, oldPrice: oldPrice && oldPrice > price ? oldPrice : undefined,
      currency, imageUrl, galleryImages, videoUrl,
      category, subcategory, platform,
      inStock, quantity: inStock ? 999 : 0,
      rating, reviewCount,
      metaTitle: seo.title, metaDescription: seo.description, metaKeywords: seo.keywords,
    }
  } catch (err) {
    console.error(`[plati-scraper] ${url}:`, err instanceof Error ? err.message : String(err))
    return null
  }
}

export function extractPlatiId(input: string): number | null {
  const s = input.trim()
  if (/^\d{5,10}$/.test(s)) return parseInt(s, 10)
  const patterns = [
    /plati\.(?:market|ru)\/itm\/(?:[^/\s?#]+\/)?(\d{5,10})/i,
    /plati\.(?:market|ru)\/asp2\/pay\.asp\?id_d=(\d{5,10})/i,
    /[?&]id_d=(\d{5,10})/i,
    /\/(\d{5,10})(?:[/?#]|$)/,
  ]
  for (const p of patterns) {
    const m = s.match(p)
    if (m) return parseInt(m[1], 10)
  }
  return null
}
