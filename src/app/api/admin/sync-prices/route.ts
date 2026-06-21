import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { getDigisellerProducts, getProductPublicPrice } from "../../../../lib/digiseller"
import { getImportSettings, applyMarkup } from "../../../../lib/import-settings"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const settings = await getImportSettings()

    // Step 1: Get all seller's own products from Digiseller (most reliable source)
    const sellerPriceMap = new Map<number, number>()
    try {
      let page = 1
      while (true) {
        const result = await getDigisellerProducts(page, 200)
        for (const p of result.rows) {
          if (p.price_rub > 0) sellerPriceMap.set(p.id_goods, p.price_rub)
        }
        if (page >= result.pages) break
        page++
      }
    } catch {}

    // Step 2: Get all active products from DB
    const dbProducts = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, digisellerProductId: true, price: true, name: true },
    })

    let updated = 0, skipped = 0, fromPublicApi = 0

    for (const product of dbProducts) {
      const digiId = product.digisellerProductId
      let rawPrice = sellerPriceMap.get(digiId) ?? 0

      // Fallback: use public Digiseller API for products not in seller's list
      if (!rawPrice) {
        rawPrice = await getProductPublicPrice(digiId)
        if (rawPrice > 0) fromPublicApi++
      }

      if (!rawPrice || rawPrice <= 0) { skipped++; continue }

      const newPrice = applyMarkup(rawPrice, settings)
      if (Math.abs(newPrice - product.price) < 0.01) { skipped++; continue }

      await prisma.product.update({
        where: { id: product.id },
        data: { price: newPrice, updatedAt: new Date() },
      })
      updated++
    }

    return NextResponse.json({
      updated, skipped, fromPublicApi,
      total: dbProducts.length,
      sellerProductsFound: sellerPriceMap.size,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Ошибка синхронизации" }, { status: 500 })
  }
}