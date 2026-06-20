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

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1))
  const q = req.nextUrl.searchParams.get("q") ?? ""
  const status = req.nextUrl.searchParams.get("status") ?? "all"
  const PAGE = 50

  const where = {
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(status === "active" ? { isActive: true } : status === "hidden" ? { isActive: false } : {}),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { importedAt: "desc" },
      take: PAGE,
      skip: (page - 1) * PAGE,
      select: {
        id: true, name: true, price: true, isActive: true,
        digisellerProductId: true, categoryId: true,
        category: { select: { name: true } },
      },
    }),
    prisma.product.count({ where }),
  ])

  return NextResponse.json({ products, total, pages: Math.ceil(total / PAGE) })
}
