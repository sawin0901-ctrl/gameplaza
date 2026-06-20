import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../lib/prisma"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) return NextResponse.json([])

  const products = await prisma.product.findMany({
    where: { isActive: true, name: { contains: q, mode: "insensitive" } },
    take: 6,
    select: { slug: true, name: true, price: true, imageUrl: true, digisellerProductId: true },
    orderBy: { soldCount: "desc" },
  })

  return NextResponse.json(products)
}
