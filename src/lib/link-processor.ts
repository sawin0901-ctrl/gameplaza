import * as cheerio from "cheerio"
import { prisma } from "./prisma"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gameplaza.site"
const PLATI_PATTERNS = [
  /https?:\/\/(www\.)?plati\.market[^\s"<]*/gi,
  /https?:\/\/(www\.)?digiseller\.ru[^\s"<]*/gi,
]
const DIGISELLER_PRODUCT_RE = /(?:product_id=|goods\/)(\d+)/i

export async function processDescription(html: string): Promise<string> {
  const $ = cheerio.load(html, { decodeEntities: false })
  const linkEls = $("a[href]").toArray()

  // Collect all Digiseller product IDs first to avoid N+1 queries
  const digiIdMap = new Map<number, cheerio.Element>()
  for (const el of linkEls) {
    const href = $(el).attr("href") ?? ""
    const match = href.match(DIGISELLER_PRODUCT_RE)
    if (match) {
      digiIdMap.set(parseInt(match[1]), el)
    }
  }

  // Single batch query for all referenced products
  if (digiIdMap.size > 0) {
    const ids = Array.from(digiIdMap.keys())
    const existing = await prisma.product.findMany({
      where: { digisellerProductId: { in: ids } },
      select: { digisellerProductId: true, slug: true, isActive: true },
    })
    const productMap = new Map(existing.map(p => [p.digisellerProductId, p]))

    const missingIds = ids.filter(id => !productMap.has(id))
    if (missingIds.length > 0) {
      await prisma.$transaction(
        missingIds.map(id =>
          prisma.importQueue.upsert({
            where: { digisellerProductId: id },
            update: {},
            create: { digisellerProductId: id, priority: 1 },
          })
        )
      )
    }

    for (const [digiId, el] of digiIdMap) {
      const product = productMap.get(digiId)
      if (product?.isActive) {
        $(el).attr("href", `${SITE_URL}/product/${product.slug}`)
      }
    }
  }

  // Replace external plati/digiseller links in remaining anchors
  for (const el of linkEls) {
    const href = $(el).attr("href") ?? ""
    if (digiIdMap.has(parseInt((href.match(DIGISELLER_PRODUCT_RE) ?? [])[1] ?? ""))) continue
    for (const pattern of PLATI_PATTERNS) {
      pattern.lastIndex = 0
      if (pattern.test(href)) {
        $(el).attr("href", SITE_URL)
        $(el).removeAttr("target")
        break
      }
    }
  }

  let result = $.html("body").replace(/<\/?body>/g, "")
  for (const pattern of PLATI_PATTERNS) {
    result = result.replace(pattern, SITE_URL)
  }
  return result
}

export function stripExternalLinks(text: string): string {
  let result = text
  for (const pattern of PLATI_PATTERNS) {
    result = result.replace(pattern, SITE_URL)
  }
  return result
}
