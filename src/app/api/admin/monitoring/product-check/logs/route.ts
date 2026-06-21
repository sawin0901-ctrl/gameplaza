import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../../lib/auth"
import { prisma } from "../../../../../../lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const perPage = 50
  const event = searchParams.get("event") ?? ""
  const level = searchParams.get("level") ?? ""

  const where = {
    category: "product_monitor",
    ...(level ? { level } : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.systemLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.systemLog.count({ where }),
  ])

  // Stats
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [priceToday, hiddenToday, publishedToday, errorsToday, pendingNotifs] = await Promise.all([
    prisma.systemLog.count({ where: { category: "product_monitor", level: "info", message: { contains: "💱" }, createdAt: { gte: today } } }),
    prisma.systemLog.count({ where: { category: "product_monitor", level: "warn", message: { contains: "скрыт" }, createdAt: { gte: today } } }),
    prisma.systemLog.count({ where: { category: "product_monitor", level: "info", message: { contains: "снова" }, createdAt: { gte: today } } }),
    prisma.systemLog.count({ where: { category: "product_monitor", level: "error", createdAt: { gte: today } } }),
    prisma.systemLog.count({ where: { category: "product_monitor", status: "new" } }),
  ])

  return NextResponse.json({
    logs, total, pages: Math.ceil(total / perPage),
    stats: { priceToday, hiddenToday, publishedToday, errorsToday, pendingNotifs },
  })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  // Mark all product_monitor logs as read
  await prisma.systemLog.updateMany({
    where: { category: "product_monitor", status: "new" },
    data: { status: "resolved", resolvedAt: new Date() },
  })
  return NextResponse.json({ ok: true })
}