import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const page = Math.max(1, Math.min(10000, parseInt(req.nextUrl.searchParams.get("page") ?? "1") || 1))
  const q = req.nextUrl.searchParams.get("q") ?? ""
  const status = req.nextUrl.searchParams.get("status") ?? "all"
  const PAGE = 50

  const where = {
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(status === "active" ? { isActive: true } : status === "hidden" ? { isActive: false } : {}),
  }

  try {
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { importedAt: "desc" },
        take: PAGE,
        skip: (page - 1) * PAGE,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          isActive: true,
          imageUrl: true,
          digisellerProductId: true,
          importedAt: true,
        },
      }),
      prisma.product.count({ where }),
    ])
    return NextResponse.json({ products, total, pages: Math.ceil(total / PAGE) })
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, price, isActive, name } = await req.json()
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

  const data: Record<string, unknown> = {}
  if (price !== undefined) data.price = price
  if (isActive !== undefined) { data.isActive = isActive }
  if (name !== undefined) data.name = name

  const product = await prisma.product.update({ where: { id }, data })
  return NextResponse.json(product)
}