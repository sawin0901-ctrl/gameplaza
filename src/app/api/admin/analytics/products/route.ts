import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const days = Math.min(90, parseInt(req.nextUrl.searchParams.get("days") ?? "30") || 30)
  const since = new Date(Date.now() - days * 86400_000)
  try {
    const topProducts = await prisma.orderItem.groupBy({
      by: ["productId", "name"],
      _count: { id: true },
      _sum: { price: true },
      where: { order: { createdAt: { gte: since }, status: { not: "cancelled" } } },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    })
    const withRatings = await Promise.all(topProducts.map(async p => {
      const product = p.productId ? await prisma.product.findUnique({ where: { id: p.productId }, select: { slug: true, imageUrl: true, rating: true, soldCount: true } }) : null
      return { productId: p.productId, name: p.name, sales: p._count.id, revenue: p._sum.price ?? 0, ...(product ?? {}) }
    }))
    return NextResponse.json({ products: withRatings, days })
  } catch { return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 }) }
}