import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) return NextResponse.json({ products: [], users: [], orders: [] })

  const [products, users, orders] = await Promise.all([
    prisma.product.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, slug: true, price: true, isActive: true },
      take: 5, orderBy: { soldCount: "desc" },
    }),
    prisma.user.findMany({
      where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] },
      select: { id: true, name: true, email: true, role: true },
      take: 3,
    }),
    prisma.order.findMany({
      where: { OR: [{ email: { contains: q, mode: "insensitive" } }, { id: { contains: q } }] },
      select: { id: true, email: true, totalAmount: true, status: true },
      take: 3, orderBy: { createdAt: "desc" },
    }),
  ])

  return NextResponse.json({ products, users, orders })
}