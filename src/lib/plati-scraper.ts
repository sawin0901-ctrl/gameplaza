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
  const clean = desc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
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

  // Helper: upscale CDN thumbnail params
  const upscale = (u: string) => u
    .replace(/([?&])w=(?:88|200|400)(&|$)/, "$1w=800$2")
    .replace(/maxlength=(?:88|200|400)/, "maxlength=800")

  // Priority 1: og:image from digiseller.mycdn.ink CDN — high-quality WebP (not graph.digiseller.ru)
  const ogImg = toAbs($("meta[property='og:image']").first().attr("content"))
  if (ogImg && ogImg.startsWith("http") && !ogImg.includes("graph.digiseller.ru")) {
    seen.add(upscale(ogImg))
  }

  // Priority 2: Plati.Market main product image — img.preview-image uses data-src for full res
  const previewEl = $("img.preview-image").first()
  const previewSrc = toAbs(previewEl.attr("data-src") ?? previewEl.attr("src") ?? "")
  if (previewSrc && previewSrc.startsWith("http") && !seen.has(upscale(previewSrc))) {
    seen.add(upscale(previewSrc))
  }

  // Priority 3: Twitter card image
  const twImg = toAbs($("meta[name='twitter:image']").first().attr("content"))
  if (twImg && twImg.startsWith("http") && !seen.has(twImg)) seen.add(twImg)

  // Priority 4: JSON-LD structured data
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

  // Priority 5: itemprop="image" — upscale to avoid duplicate low-res entry in seen
  const itemImg = toAbs($("[itemprop='image']").first().attr("content") || $("img[itemprop='image']").first().attr("src"))
  if (itemImg && itemImg.startsWith("http") && !seen.has(upscale(itemImg))) seen.add(upscale(itemImg))

  // Priority 6: graph.digiseller.ru intentionally skipped — it returns placeholder box when no image uploaded

  // Priority 7: Common plati.market selectors — prefer data-src (lazy-loaded full res) over src (thumbnail)
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
    const el = $(sel).first()
    const src = toAbs(el.attr("data-src") ?? el.attr("src") ?? "")
    if (src && src.startsWith("http") && !seen.has(upscale(src))) { seen.add(upscale(src)); break }
  }

  // Priority 8: Any img with meaningful src
  if (seen.size === 0) {
    $("img").each((_, el) => {
      if (seen.size >= 1) return false
      const src = toAbs($(el).attr("data-src") ?? $(el).attr("src") ?? "")
      const w = parseInt($(el).attr("width") ?? "0")
      const h = parseInt($(el).attr("height") ?? "0")
      if (src && src.startsWith("http") && !src.includes("logo") && !src.includes("icon") &&
          !src.includes("sprite") && (w === 0 || w >= 50) && (h === 0 || h >= 50)) {
        seen.add(src)
      }
    })
  }

  // Gallery: extract additional images from Plati.Market
  const gallery: string[] = []

  // Method 1: JSON-LD Product images array (most reliable — includes all seller screenshots)
  try {
    $("script[type='application/ld+json']").each((_, el) => {
      const txt = $(el).html() ?? ""
      const json = JSON.parse(txt)
      const imgs: string[] = Array.isArray(json?.image) ? json.image : (json?.image ? [json.image] : [])
      for (const imgUrl of imgs) {
        const abs = toAbs(String(imgUrl))
        if (abs && abs.startsWith("http") && !seen.has(abs)) {
          seen.add(abs)
          gallery.push(abs)
        }
      }
    })
  } catch {}

  // Method 2: Plati.Market gallery thumbnails — prefer data-src (w=400) over src (w=88 thumbnail)
  const gallerySelectors = [
    // Plati.Market current design: img.icon--thumbnail[data-idx] holds all gallery images with data-src=w400
    "img.icon--thumbnail",
    "img[data-idx][data-src]",
    // Legacy / other selectors
    ".goods-photo-list [data-full-src]",
    ".goods-photo-list img",
    ".goods-gallery [data-full-src]",
    ".goods-gallery img",
    ".product-images [data-full-src]",
    ".product-images img",
    ".gallery-thumb [data-full-src]",
    ".gallery-thumb img",
    "[data-gallery] img",
    ".product-gallery img",
  ]
  for (const sel of gallerySelectors) {
    $(sel).each((_, el) => {
      const fullSrc = $(el).attr("data-full-src") ?? $(el).attr("data-src") ?? $(el).attr("src") ?? ""
      const src = toAbs(fullSrc)
      const hq = upscale(src)
      if (hq && hq.startsWith("http") && !seen.has(hq)) {
        // Skip obvious icon/logo sizes (< 100px)
        const w = parseInt($(el).attr("width") ?? "0")
        const h = parseInt($(el).attr("height") ?? "0")
        if ((w > 0 && w < 100) || (h > 0 && h < 100)) return
        seen.add(hq)
        gallery.push(hq)
      }
    })
    if (gallery.length >= 8) break
  }

  const allImages = Array.from(seen)
  const DIGISELLER_PLACEHOLDER = /graph\.digiseller\.ru\/img\.ashx/
  const mainImage = (allImages[0] && !DIGISELLER_PLACEHOLDER.test(allImages[0])) ? allImages[0] : ""

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

    // Skip Plati.Market service/category/search pages — not real products
    const PLATI_SERVICE_RE = /(?:plati\.?market|плати[\s.]маркет|магазин цифровых товаров|каталог товаров|результаты поиска)/i
    if (PLATI_SERVICE_RE.test(name)) {
      console.warn("[plati-scraper] Service page for " + productId + ": " + name.slice(0, 80))
      return null
    }

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

    // If price is in USD — find RUB price from page
    if (price > 0 && (currency === "USD" || (currency !== "RUB" && price < 200) || price < 100)) {
      let rubPrice = 0

      // Method 0: meta description — Plati writes "и это будет стоить N₽" in <head>
      if (!rubPrice) {
        const metaDesc = $("meta[name='description']").first().attr("content") ?? ""
        const ogDesc2  = $("meta[property='og:description']").first().attr("content") ?? ""
        const descText = metaDesc + " " + ogDesc2
        const descMatch = descText.match(/(\d[\d\s]{1,6})\s*(?:₽|руб(?:лей|ля)?|р\.)/i)
        if (descMatch) {
          const p = parseFloat(descMatch[1].replace(/\s/g, ""))
          if (p >= 100 && p < 100000) rubPrice = Math.ceil(p)
        }
      }

      // Method 1: JSON-LD offers with RUB currency
      try {
        $("script[type='application/ld+json']").each((_: unknown, el: unknown) => {
          const txt = $(el as cheerio.Element).html() ?? ""
          const json = JSON.parse(txt)
          const offers = Array.isArray(json?.offers) ? json.offers : [json?.offers].filter(Boolean)
          for (const offer of offers) {
            if (offer?.priceCurrency === "RUB" && offer?.price) {
              rubPrice = Math.ceil(parseFloat(String(offer.price)))
              return false
            }
          }
        })
      } catch {}

      // Method 2: meta tags — prefer RUB-tagged price, fallback to any price >= 200
      if (!rubPrice) {
        const priceMetas = $("meta[property='product:price:amount']").toArray()
        const currMetas  = $("meta[property='product:price:currency']").toArray()
        for (let i = 0; i < priceMetas.length; i++) {
          const curr = ($(currMetas[i] ?? currMetas[0]).attr("content") ?? "").toUpperCase()
          if (curr === "RUB") {
            const p = parseFloat($(priceMetas[i]).attr("content") ?? "0")
            if (p >= 30) { rubPrice = Math.ceil(p); break }
          }
        }
        if (!rubPrice) {
          const highPrice = priceMetas.map(el => parseFloat($(el).attr("content") ?? "0")).find(p => p >= 200 && p < 100000)
          if (highPrice) rubPrice = Math.ceil(highPrice)
        }
      }

      // Method 3: visible price in page text (₽ symbol) — skip variant modifiers (+N ₽)
      if (!rubPrice) {
        const bodyText = $("body").text()
        const cleanText = bodyText.replace(/\+\s*\d[\d\s]*\s*(?:₽|руб(?:лей|ля)?|р\.)/gi, "")
        const matches = [...cleanText.matchAll(/(\d[\d\s]{1,6})\s*(?:₽|руб(?:лей|ля)?|р\.)/g)]
        const candidates = matches
          .map(m => parseFloat(m[1].replace(/\s/g, "")))
          .filter(p => p >= 100 && p < 50000)
        if (candidates.length > 0) {
          rubPrice = Math.ceil(candidates[0])
        }
      }

      // Method 4: scan raw HTML for price_rub field (Plati SSR hydration data)
      if (!rubPrice) {
        const rawHtml = $.html()
        const htmlPats: RegExp[] = [
          /"price_rub"\s*:\s*(\d+(?:\.\d+)?)/,
          /"priceRub"\s*:\s*(\d+(?:\.\d+)?)/,
          /"price"\s*:\s*"?(\d+(?:\.\d+)?)"?[^}]{0,100}"currency"\s*:\s*"RUB"/,
          /"currency"\s*:\s*"RUB"[^}]{0,100}"price"\s*:\s*"?(\d+(?:\.\d+)?)"?/,
        ]
        for (const pat of htmlPats) {
          const m = rawHtml.match(pat)
          if (m) { const p = parseFloat(m[1]); if (p >= 30 && p < 100000) { rubPrice = Math.ceil(p); break } }
        }
      }

      if (rubPrice > 0) {
        console.log(`[plati-scraper] RUB price found: ${rubPrice} (was ${price} ${currency})`)
        price = rubPrice
      } else {
        console.warn(`[plati-scraper] Could not determine RUB price for ${productId}, USD price: ${price}`)
      }
    }


    // Method 5: Digiseller payment page — reliable RUB price for any Plati product
    // URL: oplata.info/asp2/pay_wm.asp?id_d=ID always has <span id=price_value> in RUB
    if (price < 30) {
      try {
        const payUrl = `https://www.oplata.info/asp2/pay_wm.asp?id_d=${productId}`
        const payResp = await axios.get(payUrl, { headers: BROWSER_HEADERS, timeout: 10000, validateStatus: () => true })
        if (payResp.status === 200 && typeof payResp.data === "string") {
          const $pay = cheerio.load(payResp.data)
          const priceText = $pay("#price_value").first().text().trim()
          const currText  = $pay("#price_currency").first().text().trim().toUpperCase()
          const dp = parseFloat(priceText)
          if (dp >= 30 && dp < 100000 && (currText === "RUB" || currText === "")) {
            price = Math.ceil(dp)
            console.log(`[plati-scraper] Digiseller page price ${productId}: ${price} RUB`)
          }
        }
      } catch {}
    }
    // Last resort: scan page body when price is zero or suspiciously low (USD mistagged as RUB)
    if (price < 100) {
      const bodyText2 = $("body").text()
      const cleanBody = bodyText2.replace(/\+\s*\d[\d\s]*\s*(?:₽|руб(?:лей|ля)?|р\.)/gi, "")
      const bodyMatches = [...cleanBody.matchAll(/(\d[\d\s]{1,6})\s*(?:₽|руб(?:лей|ля)?|р\.)/g)]
      const bodyCandidates = bodyMatches.map(m => parseFloat(m[1].replace(/\s/g, ""))).filter(p => p >= 30 && p < 100000)
      if (bodyCandidates.length > 0) {
        price = Math.ceil(bodyCandidates[0])
        console.log(`[plati-scraper] body-text price ${productId}: ${price}`)
      }
    }

    // Old price
    const oldPriceText = $(".price-old .val, del .val, .price-old, s .price-val").first().text()
    const oldPrice = parseFloat(oldPriceText.replace(/[^\d.,]/g, "").replace(",", ".")) || undefined

    // Description — try many selectors; Plati regularly changes their HTML structure
    const ogDesc = $("meta[property='og:description']").first().attr("content") ?? ""
    const metaDesc = $("meta[name='description']").first().attr("content") ?? ""
    const DESC_SELECTORS = [
      ".goods-description-main", ".description-goods-main",
      "[itemprop='description']", ".goods-description",
      ".product-description", ".goods-description-inner",
      ".goods-description-content", ".description-inner",
      ".description-block", ".product-desc", ".item-description",
      ".goods-text", ".product-text", ".lots-offer__desc",
      "#goods-description", "#description", ".tab-description",
      ".goods__description", ".good__description", ".item__description",
      ".product-body__description", ".goods-card__description",
    ]
    let descHtml = ""
    for (const sel of DESC_SELECTORS) {
      const html = $(sel).first().html()?.trim() ?? ""
      if (html.replace(/<[^>]+>/g, "").trim().length > 5) { descHtml = html; break }
    }
    if (!descHtml) {
      let jFound = false
      $("script[type='application/ld+json']").each((_, el) => {
        if (jFound) return
        try {
          const json = JSON.parse($(el).html() ?? "")
          const d = json?.description ?? ""
          if (d && String(d).length > 5) { descHtml = String(d); jFound = true }
        } catch {}
      })
    }
    if (!descHtml || descHtml.replace(/<[^>]+>/g, "").trim().length < 5) {
      descHtml = ogDesc || metaDesc
    }
    const description = descHtml.trim()
    // Skip Plati.Market generic marketplace description (category/search pages)
    const PLATI_MARKETPLACE_RE = /(?:более миллиона лотов|маркетплейс цифровых товаров|игры,\s*ключи,\s*аккаунты,\s*подписки,\s*софт)/i
    if (PLATI_MARKETPLACE_RE.test(descHtml.replace(/<[^>]+>/g, " "))) {
      console.warn("[plati-scraper] Plati marketplace description for " + productId + ", skipping")
      return null
    }
    const plainText = descHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    const shortDesc = plainText.slice(0, 300).trim()

    // Images
    const { main: imageUrl, gallery: galleryImages } = extractImageFromHtml($, productId)

    // Video
    const videoSrc = $("iframe[src*='youtube'], iframe[src*='youtu.be']").first().attr("src")
    const videoUrl = videoSrc ?? undefined

    // Stock — check availability from schema attribute (href or content) and visible text
    const availEl = $("[itemprop='availability']").first()
    const availHref = (availEl.attr("href") ?? availEl.attr("content") ?? "").toLowerCase()
    const stockText = $(".goods-status, .stock-status, .availability, .goods-availability").first().text().toLowerCase()
    const isOutOfStock = availHref.includes("outofstock") ||
      stockText.includes("нет") || stockText.includes("отсутств") || stockText.includes("unavailable")
    const inStock = !isOutOfStock && (
      availHref.includes("instock") ||
      $("[itemscope] [itemprop='availability'][href*='InStock']").length > 0 ||
      availHref === "" && !stockText
    )

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


export interface PlatiReview {
  text: string
  rating: number
  date?: Date
}

export async function scrapePlatiReviews(productId: number, limit = 5, platiUrl?: string): Promise<PlatiReview[]> {
  const reviews: PlatiReview[] = []

  function parseDate(txt: string): Date | undefined {
    if (!txt) return undefined
    const iso = new Date(txt)
    if (!isNaN(iso.getTime())) return iso
    const m = txt.match(/(\d{2})\.(\d{2})\.(\d{4})/)
    if (m) return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]))
    return undefined
  }

  // ── Method 0: Digiseller reviews page (SSR, no JS required) ─────────────
  // oplata.info/asp2/otzyvy.asp?id_d=ID is a pure ASP.NET page with all reviews
  try {
    const otzUrl = `https://www.oplata.info/asp2/otzyvy.asp?id_d=${productId}`
    const otzResp = await axios.get(otzUrl, { headers: BROWSER_HEADERS, timeout: 15000, validateStatus: () => true })
    if (otzResp.status === 200 && typeof otzResp.data === "string" && otzResp.data.length > 500) {
      const $o = cheerio.load(otzResp.data)
      // Common Digiseller review containers on their legacy ASP pages
      const selectors = ["[data-tr-type='review']", ".review-text", ".feedback-text", ".otzyv", ".review", "td.color-text-primary"]
      for (const sel of selectors) {
        const items = $o(sel)
        if (items.length === 0) continue
        items.each((_, el) => {
          if (reviews.length >= limit) return false
          const text = $o(el).text().replace(/\s+/g, " ").trim()
          if (!text || text.length < 10) return
          const li = $o(el).closest("li,tr,div.review,div.otzyv")
          const isNeg = li.find('[class*="thumb-down"],[class*="negative"],[class*="dislike"]').length > 0
          let date: Date | undefined
          li.find("*").each((_, node) => {
            if (date) return false
            const t = $o(node).clone().children().remove().end().text().trim()
            date = parseDate(t)
          })
          reviews.push({ text, rating: isNeg ? 2 : 5, date })
        })
        if (reviews.length > 0) break
      }
    }
  } catch { /* ignore */ }

  if (reviews.length >= limit) return reviews.slice(0, limit)

  // ── Method 1: Plati.Market product page HTML (SSR content only) ──────────
  const pageUrl = platiUrl ?? `https://plati.market/itm/${productId}`
  try {
    const { data } = await axios.get(pageUrl, { headers: BROWSER_HEADERS, timeout: 20000 })
    const $ = cheerio.load(data)

    // 1a. Current layout: [data-tr-type="review"] in #ResponsesBlock
    $('[data-tr-type="review"]').each((_, el) => {
      if (reviews.length >= limit) return false
      const text = $(el).text().replace(/\s+/g, " ").trim()
      if (!text || text.length < 10) return
      const li = $(el).closest("li")
      const isNeg = li.find('[class*="thumb-down"],[class*="thumbDown"],[class*="dislike"]').length > 0
      let date: Date | undefined
      li.find("*").each((_, node) => {
        if (date) return false
        const t = $(node).clone().children().remove().end().text().trim()
        date = parseDate(t)
      })
      reviews.push({ text, rating: isNeg ? 2 : 5, date })
    })

    // 1b. Legacy CSS selectors
    if (reviews.length === 0) {
      for (const sel of [".lot-review-item", ".review-item", ".reviews-item", "[itemprop='review']", ".goods-review", ".feedback-item"]) {
        const items = $(sel)
        if (items.length === 0) continue
        items.each((_, el) => {
          if (reviews.length >= limit) return false
          const text = (
            $(el).find(".review-text,.review__text,.feedback-text,.comment,[itemprop='reviewBody'],.lot-review-item__text").first().text().trim() ||
            $(el).find("p").first().text().trim()
          ).replace(/\s+/g, " ").trim()
          if (!text || text.length < 10) return
          const isNeg = $(el).find(".icon--thumb-down,.thumb-down,.dislike").length > 0 || $(el).hasClass("negative") || $(el).hasClass("bad")
          const timeEl = $(el).find("time,.date,.review-date,[class*='date']").first()
          const dateText = timeEl.attr("datetime") ?? timeEl.attr("data-date") ?? timeEl.text().trim()
          reviews.push({ text, rating: isNeg ? 2 : 5, date: parseDate(dateText) })
        })
        if (reviews.length > 0) break
      }
    }

    // 1c. JSON-LD review entries
    if (reviews.length === 0) {
      $("script[type='application/ld+json']").each((_, el) => {
        if (reviews.length >= limit) return false
        try {
          const json = JSON.parse($(el).html() ?? "")
          const items: unknown[] = Array.isArray(json?.review) ? json.review : (json?.review ? [json.review] : [])
          for (const item of items) {
            if (reviews.length >= limit) break
            if (typeof item !== "object" || item === null) continue
            const rv = item as Record<string, unknown>
            const text = String(rv.reviewBody ?? rv.description ?? "").trim()
            if (!text || text.length < 10) continue
            const ratingVal = (rv.reviewRating as Record<string, unknown>)?.ratingValue
            const rating = ratingVal ? Math.min(5, Math.max(1, Math.round(Number(ratingVal)))) : 5
            reviews.push({ text, rating, date: parseDate(String(rv.datePublished ?? "")) })
          }
        } catch {}
      })
    }
  } catch (err) {
    console.error(`[plati-scraper] reviews ${productId}:`, err instanceof Error ? err.message : String(err))
  }

  return reviews.slice(0, limit)
}