import { NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { scrapePlatiProduct } from "../../../../lib/plati-scraper"
import { getImportSettings, applyMarkup } from "../../../../lib/import-settings"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const BATCH_SIZE = 30
const DELAY_MS = 1200
const RECHECK_HOURS = 24

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const since = new Date(Date.now() - RECHECK_HOURS * 60 * 60 * 1000)

  const products = await prisma.product.findMany({
    where: {
      importSource: "plati",
      OR: [
        { lastCheckedAt: null },
        { lastCheckedAt: { lt: since } },
      ],
    },
    select: { id: true, digisellerProductId: true, inStock: true, isActive: true },
    orderBy: { lastCheckedAt: "asc" },
    take: BATCH_SIZE,
  })

  if (products.length === 0) {
    return NextResponse.json({ status: "idle", message: "All products checked in last 24h" })
  }

  const settings = await getImportSettings()
  const results = { processed: products.length, updated: 0, deactivated: 0, reactivated: 0, errors: 0 }

  for (const product of products) {
    try {
      const raw = await scrapePlatiProduct(product.digisellerProductId).catch(() => null)

      const newInStock = raw?.inStock ?? false
      const newPrice = (raw?.price && raw.price >= 30) ? applyMarkup(raw.price, settings) : null
      const isActive = newInStock && newPrice !== null && newPrice > 50

      await prisma.product.update({
        where: { id: product.id },
        data: {
          inStock: newInStock,
          ...(newPrice !== null ? { price: newPrice } : {}),
          ...(raw?.oldPrice && raw.oldPrice > 0 ? { oldPrice: applyMarkup(raw.oldPrice, settings) } : {}),
          isActive,
          lastCheckedAt: new Date(),
        },
      })

      if (!isActive && product.isActive) results.deactivated++
      else if (isActive && !product.isActive) results.reactivated++
      else results.updated++
    } catch {
      results.errors++
      await prisma.product.update({
        where: { id: product.id },
        data: { lastCheckedAt: new Date() },
      }).catch(() => {})
    }

    await new Promise<void>(resolve => setTimeout(resolve, DELAY_MS))
  }

  return NextResponse.json({ status: "ok", ...results })
}