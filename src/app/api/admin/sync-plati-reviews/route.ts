import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { scrapePlatiReviews } from "../../../../lib/plati-scraper"

export const maxDuration = 300

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as { role?: string })?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const batchSize = Math.min(Number(body.batchSize) || 20, 50)
  const offset    = Math.max(Number(body.offset) || 0, 0)
  const maxReviews = Math.min(Number(body.maxReviews) || 5, 10)

  // Only Plati products
  const products = await prisma.product.findMany({
    where: { importSource: "plati", isActive: true },
    select: { id: true, digisellerProductId: true, name: true, platiUrl: true },
    orderBy: { importedAt: "asc" },
    take: batchSize,
    skip: offset,
  })

  const total = await prisma.product.count({ where: { importSource: "plati", isActive: true } })

  let imported = 0
  let skipped  = 0
  let errors   = 0

  for (const product of products) {
    try {
      const platiId = product.digisellerProductId

      // Skip if already has Plati reviews
      const existing = await prisma.review.count({
        where: { productId: product.id, source: "plati" },
      })
      if (existing >= maxReviews) { skipped++; continue }

      const reviews = await scrapePlatiReviews(platiId, maxReviews, product.platiUrl ?? undefined)
      if (reviews.length === 0) { skipped++; continue }

      // Get already imported review texts to avoid duplicates
      const existingTexts = await prisma.review.findMany({
        where: { productId: product.id, source: "plati" },
        select: { text: true },
      })
      const existingSet = new Set(existingTexts.map(r => r.text.slice(0, 80)))

      const toInsert = reviews
        .filter(rv => !existingSet.has(rv.text.slice(0, 80)))
        .map((rv, i) => ({
          productId:  product.id,
          rating:     rv.rating,
          text:       rv.text,
          source:     "plati",
          authorName: "Покупатель",
          isApproved: true,
          createdAt:  rv.date ?? new Date(Date.now() - i * 86_400_000 * 7),
        }))

      if (toInsert.length === 0) { skipped++; continue }

      await prisma.review.createMany({ data: toInsert, skipDuplicates: true })

      // Update product rating
      const allReviews = await prisma.review.findMany({
        where: { productId: product.id, isApproved: true },
        select: { rating: true },
      })
      if (allReviews.length > 0) {
        const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length
        await prisma.product.update({
          where: { id: product.id },
          data: { rating: Math.round(avg * 10) / 10, reviewCount: allReviews.length },
        })
      }

      imported += toInsert.length
    } catch {
      errors++
    }
  }

  return NextResponse.json({
    ok: true,
    processed: products.length,
    total,
    remaining: Math.max(0, total - offset - batchSize),
    nextOffset: offset + batchSize,
    imported,
    skipped,
    errors,
  })
}