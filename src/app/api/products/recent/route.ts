import { NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"

export async function POST(req: Request) {
  try {
    const { ids } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json([])

    const products = await prisma.product.findMany({
      where: { id: { in: ids.slice(0, 10) }, isActive: true },
      select: { id: true, slug: true, name: true, imageUrl: true, price: true },
    })

    const map = new Map(products.map(p => [p.id, { ...p, price: Number(p.price) }]))
    const ordered = ids.map(id => map.get(id)).filter(Boolean)

    return NextResponse.json(ordered)
  } catch {
    return NextResponse.json([])
  }
}