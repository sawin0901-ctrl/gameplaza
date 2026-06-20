import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../lib/prisma"
import { rateLimit } from "../../../lib/rate-limit"

export async function GET(req: NextRequest) {
  // Rate limit: 30 запросов в минуту по IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  if (!rateLimit(`search:${ip}`, 30, 60 * 1000)) {
    return NextResponse.json([], { status: 429 })
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100)
  if (q.length < 2) return NextResponse.json([])

  try {
    const products = await prisma.product.findMany({
      where: { isActive: true, name: { contains: q, mode: "insensitive" } },
      take: 6,
      select: { slug: true, name: true, price: true, imageUrl: true, digisellerProductId: true },
      orderBy: { soldCount: "desc" },
    })

    return NextResponse.json(products, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    })
  } catch (err) {
    console.error("[search] DB error:", err)
    return NextResponse.json([], { status: 500 })
  }
}
