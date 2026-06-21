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

function toAbs(src: string | undefined | null): string {
  if (!src) return ""
  const s = src.trim()
  if (!s || s.startsWith("data:")) return ""
  if (s.startsWith("http")) return s
  if (s.startsWith("//")) return "https:" + s
  if (s.startsWith("/")) return "https://plati.market" + s
  return "https://plati.market/" + s
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
  "Cache-Control": "no-cache",
}

function extractImageFromHtml($: ReturnType<typeof cheerio.load>, productId: number): { main: string; gallery: string[] } {
  const seen = new Set<string>()

  // Priority 1: Open Graph image (most reliable, always present)
  const ogImg = toAbs($("meta[property='og:image']").first().attr("content"))
  if (ogImg && ogImg.startsWith("http")) seen.add(ogImg)

  // Priority 2: Twitter card image
  const twImg = toAbs($("meta[name='twitter:image']").first().attr("content"))
  if (twImg && twImg.startsWith("http") && !seen.has(twImg)) seen.add(twImg)

  // Priority 3: JSON-LD structured data
  try {
    $("script[type='application/ld+json']").each((_, el) => {
      const txt = $(el).html() ?? ""
      const json = JSON.parse(txt)
      const imgUrl = json?.image ?? json?.image?.[0] ?? json?.thumbnail ?? ""
      if (imgUrl) {
        const abs = toAbs(String(imgUrl))
        if (abs && abs.startsWith("http") && !seen.has(abs)) seen.add(abs)
      }
    })
  } catch {}

  // Priority 4: itemprop="image"
  const itemImg = toAbs($("[itemprop='image']").first().attr("content") || $("img[itemprop='image']").first().attr("src"))
  if (itemImg && itemImg.startsWith("http") && !seen.has(itemImg)) seen.add(itemImg)

  // Priority 5: Common plati.market selectors
  const htmlSelectors = [
    ".goods-img-large img",
    ".goods-photo img",
    ".goods-photo-main img",
    ".product-image img",
    ".product-img img",
    "img.goods-img",
    ".good-img img",
    ".item-img img",
    ".card-img img",
  ]
  for (const sel of htmlSelectors) {
    const src = toAbs($(sel).first().attr("src") ?? $(sel).first().attr("data-src") ?? "")
    if (src && src.startsWith("http") && !seen.has(src)) { seen.add(src); break }
  }

  // Priority 6: Any img with a meaningful src (not 1x1 pixel, not icon)
  if (seen.size === 0) {
    $("img").each((_, el) => {
      if (seen.size >= 1) return false
      const src = toAbs($(el).attr("src") ?? $(el).attr("data-src") ?? "")
      const w = parseInt($(el).attr("width") ?? "0")
      const h = parseInt($(el).attr("height") ?? "0")
      if (src && src.startsWith("http") && !src.includes("logo") && !src.includes("icon") &&
          !src.includes("sprite") && (w === 0 || w >= 50) && (h === 0 || h >= 50)) {
        seen.add(src)
      }
    })
  }

  // Gallery: additional images
  const gallery: string[] = []
  const gallerySelectors = [
    ".product-images img",
    ".goods-gallery img",
    ".goods-photo-list img",
    ".gallery-thumb img",
    ".product-gallery img",
    "[data-gallery] img",
  ]
  for (const sel of gallerySelectors) {
    $(sel).each((_, el) => {
      const src = toAbs($(el).attr("src") ?? $(el).attr("data-src") ?? "")
      if (src && src.startsWith("http") && !seen.has(src)) {
        seen.add(src)
        gallery.push(src)
      }
    })
  }

  const allImages = Array.from(seen)
  const mainImage = allImages[0] ||
    `https://graph.digiseller.ru/img.ashx?id_d=${productId}&maxlength=400`

  // Extra gallery from remaining images
  const extraGallery = allImages.slice(1).concat(gallery).slice(0, 8)

  return { main: mainImage, gallery: extraGallery }
}

export async function scrapePlatiProduct(productId: number): Promise<PlatiProduct | null> {
  const url = `https://plati.market/itm/${productId}`
  try {
    const { data } = await axios.get(url, { headers: BROWSER_HEADERS, timeout: 30000 })
    const $ = cheerio.load(data)

    // Check for 404 / deleted product
    const title = $("title").first().text().toLowerCase()
    if (title.includes("404") || title.includes("не найден") || title.includes("not found")) return null

    // Name
    const ogTitle = $("meta[property='og:title']").first().attr("content") ?? ""
    const name = (
      $("h1[itemprop='name']").first().text().trim() ||
      $("h1.page-title").first().text().trim() ||
      $(".goods-title h1").first().text().trim() ||
      $(".product-title h1, .product-title").first().text().trim() ||
      $("h1").first().text().trim() ||
      ogTitle
    ).replace(/\s+/g, " ").trim()

    if (!name || name.length < 3) return null

    // Price — try multiple approaches
    const priceAttr  = $("[itemprop='price']").first().attr("content")
    const ogPrice    = $("meta[property='product:price:amount']").first().attr("content")
    const priceTexts = [
      $(".price-buy .val").first().text(),
      $(".price .val").first().text(),
      $(".price-value").first().text(),
      $(".buy-price").first().text(),
      $("[data-price]").first().attr("data-price") ?? "",
    ]
    const rawPrice = priceAttr ?? ogPrice ?? priceTexts.find(t => t.trim()) ?? ""
    let price = parseFloat(rawPrice.replace(/[^\d.,]/g, "").replace(",", ".")) || 0

    // Currency
    const currency = $("[itemprop='priceCurrency']").first().attr("content") ??
      $("meta[property='product:price:currency']").first().attr("content") ?? "RUB"

    // If price is in USD (small number) — fetch RUB price from Digiseller XML API
    if (price > 0 && (currency === "USD" || (currency !== "RUB" && price < 200))) {
      try {
        const xmlResp = await axios.get(
          `https://shop.digiseller.ru/xml/goods.asp?id_d=${productId}`,
          { headers: BROWSER_HEADERS, timeout: 8000, responseType: "text" }
        )
        const xml = String(xmlResp.data)
        const rubMatch =
          xml.match(/<price_rur[^>]*>([\d.]+)<\/price_rur>/i) ||
          xml.match(/<price_rub[^>]*>([\d.]+)<\/price_rub>/i) ||
          xml.match(/currency="RUB"[^>]*>([\d.]+)</i)
        if (rubMatch) {
          const rubPrice = Math.ceil(parseFloat(rubMatch[1]))
          if (rubPrice > 0) {
            console.log(`[plati-scraper] RUB price from Digiseller XML: ${rubPrice} (was ${price} ${currency})`)
            price = rubPrice
          }
        }
      } catch (xmlErr) {
        console.warn(`[plati-scraper] Digiseller XML fallback failed for ${productId}:`, xmlErr instanceof Error ? xmlErr.message : String(xmlErr))
      }
    }

    // Old price
    const oldPriceText = $(".price-old .val, del .val, .price-old, s .price-val").first().text()
    const oldPrice = parseFloat(oldPriceText.replace(/[^\d.,]/g, "").replace(",", ".")) || undefined

    // Description
    const ogDesc = $("meta[property='og:description']").first().attr("content") ?? ""
    const description = (
      $(".goods-description-main").first().text().trim() ||
      $(".description-goods-main").first().text().trim() ||
      $("[itemprop='description']").first().text().trim() ||
      $(".goods-description").first().text().trim() ||
      $(".product-description").first().text().trim() ||
      ogDesc
    ).replace(/\s+/g, " ").trim()
    const shortDesc = description.slice(0, 300).trim()

    // Images
    const { main: imageUrl, gallery: galleryImages } = extractImageFromHtml($, productId)

    // Video
    const videoSrc = $("iframe[src*='youtube'], iframe[src*='youtu.be']").first().attr("src")
    const videoUrl = videoSrc ?? undefined

    // Stock
    const availHref = $("[itemprop='availability']").first().attr("href") ?? ""
    const stockText = $(".goods-status, .stock-status, .availability").first().text().toLowerCase()
    const inStock = availHref.includes("InStock") ||
      $("[itemscope] [itemprop='availability'][href*='InStock']").length > 0 ||
      (!stockText.includes("нет") && !stockText.includes("отсутств") && !stockText.includes("unavailable"))

    // Rating
    const ratingVal = $("[itemprop='ratingValue']").first().attr("content") ?? $("[itemprop='ratingValue']").first().text()
    const rating = parseFloat(ratingVal) || undefined
    const reviewsVal = $("[itemprop='reviewCount']").first().attr("content") ?? $("[itemprop='reviewCount']").first().text()
    const reviewCount = parseInt(reviewsVal) || undefined

    // Category
    const { category, platform } = detectCategory(name, description)

    // Subcategory from breadcrumbs
    const crumbs: string[] = []
    $(".breadcrumbs li a, nav[aria-label='breadcrumb'] a, [itemtype*='BreadcrumbList'] a").each((_, el) => {
      const t = $(el).text().trim()
      if (t && t !== "Главная" && t !== "Plati.market" && t !== "Plati.Market") crumbs.push(t)
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
