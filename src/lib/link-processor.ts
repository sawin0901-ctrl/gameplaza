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

  for (const el of linkEls) {
    const href = $(el).attr("href") ?? ""
    const match = href.match(DIGISELLER_PRODUCT_RE)
    if (match) {
      const digiId = parseInt(match[1])
      const existing = await prisma.product.findUnique({
        where: { digisellerProductId: digiId },
        select: { slug: true, isActive: true },
      })
      if (existing?.isActive) {
        $(el).attr("href", `${SITE_URL}/product/${existing.slug}`)
        continue
      } else {
        await prisma.importQueue.upsert({
          where: { digisellerProductId: digiId },
          update: {},
          create: { digisellerProductId: digiId, priority: 1 },
        })
      }
    }
    for (const pattern of PLATI_PATTERNS) {
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