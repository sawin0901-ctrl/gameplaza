import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1))
  const status = req.nextUrl.searchParams.get("status") ?? "all"
  const q = req.nextUrl.searchParams.get("q") ?? ""
  const PAGE = 30

  const where = {
    ...(status !== "all" ? { status } : {}),
    ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" as const } }, { id: { contains: q } }] } : {}),
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE,
      skip: (page - 1) * PAGE,
      include: {
        items: { select: { name: true, price: true, digiId: true } },
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.order.count({ where }),
  ])

  const stats = await prisma.order.aggregate({
    _count: true,
    _sum: { totalAmount: true },
  })

  return NextResponse.json({ orders, total, pages: Math.ceil(total / PAGE), stats })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { id: string; status: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const validStatuses = ["pending", "processing", "completed", "cancelled", "refunded"]
  if (!body.id || !validStatuses.includes(body.status)) {
    return NextResponse.json({ error: "Invalid id or status" }, { status: 422 })
  }

  const order = await prisma.order.update({
    where: { id: body.id },
    data: { status: body.status, updatedAt: new Date() },
  })
  return NextResponse.json({ order })
}
