import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { getDigisellerProducts } from "../../../../lib/digiseller"
import { getImportSettings, applyMarkup } from "../../../../lib/import-settings"

export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await getImportSettings()

    // Load all pages from Digiseller seller API
    const sellerPriceMap = new Map<number, number>()
    let sellerError: string | null = null
    try {
      let page = 1
      let totalPages = 1
      do {
        const result = await getDigisellerProducts(page, 200)
        for (const p of result.rows) {
          if (p.price_rub > 0) sellerPriceMap.set(p.id_goods, p.price_rub)
        }
        totalPages = result.pages
        page++
      } while (page <= totalPages)
    } catch (err) {
      sellerError = err instanceof Error ? err.message : "Ошибка Digiseller API"
    }

    // If seller API failed entirely — return error, do not fallback to 400 individual calls
    if (sellerPriceMap.size === 0) {
      return NextResponse.json({
        updated: 0, skipped: 0, total: 0,
        sellerProductsFound: 0,
        error: sellerError ?? "Digiseller не вернул товары. Проверьте DIGISELLER_SELLER_ID и DIGISELLER_API_KEY в .env",
      }, { status: 422 })
    }

    // Get all active products whose digiId is known in seller's list
    const dbProducts = await prisma.product.findMany({
      where: { isActive: true, digisellerProductId: { in: Array.from(sellerPriceMap.keys()) } },
      select: { id: true, digisellerProductId: true, price: true },
    })

    let updated = 0
    let skipped = 0
    const updates: { id: string; price: number }[] = []

    for (const product of dbProducts) {
      const rawPrice = sellerPriceMap.get(product.digisellerProductId) ?? 0
      if (!rawPrice) { skipped++; continue }

      const newPrice = applyMarkup(rawPrice, settings)
      if (Math.abs(newPrice - Number(product.price)) < 0.01) { skipped++; continue }

      updates.push({ id: product.id, price: newPrice })
    }

    // Batch update in parallel (max 20 concurrent)
    const CHUNK = 20
    for (let i = 0; i < updates.length; i += CHUNK) {
      const chunk = updates.slice(i, i + CHUNK)
      await Promise.all(
        chunk.map(u =>
          prisma.product.update({ where: { id: u.id }, data: { price: u.price, updatedAt: new Date() } })
            .then(() => { updated++ })
            .catch(() => { skipped++ })
        )
      )
    }

    return NextResponse.json({
      updated,
      skipped,
      total: dbProducts.length,
      sellerProductsFound: sellerPriceMap.size,
      notInSeller: (await prisma.product.count({ where: { isActive: true } })) - dbProducts.length,
    })
  } catch (err) {
    console.error("[sync-prices]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ошибка синхронизации" },
      { status: 500 }
    )
  }
}