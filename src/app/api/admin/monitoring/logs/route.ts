import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 25

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"))
  const level = sp.get("level") ?? undefined
  const category = sp.get("category") ?? undefined
  const status = sp.get("status") ?? undefined
  const dateFrom = sp.get("dateFrom") ? new Date(sp.get("dateFrom")!) : undefined
  const dateTo = sp.get("dateTo") ? new Date(sp.get("dateTo")!) : undefined
  const countOnly = sp.get("count") === "true"

  const where = {
    ...(level && level !== "all" ? { level } : {}),
    ...(category && category !== "all" ? { category } : {}),
    ...(status && status !== "all" ? { status } : {}),
    ...(dateFrom || dateTo ? {
      createdAt: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      }
    } : {}),
  }

  if (countOnly) {
    const count = await prisma.systemLog.count({ where })
    return NextResponse.json({ count })
  }

  const [total, logs] = await Promise.all([
    prisma.systemLog.count({ where }),
    prisma.systemLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  // Stats for dashboard
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [errorsToday, warnsToday, infoToday, newTotal] = await Promise.all([
    prisma.systemLog.count({ where: { level: "error", createdAt: { gte: today } } }),
    prisma.systemLog.count({ where: { level: "warn", createdAt: { gte: today } } }),
    prisma.systemLog.count({ where: { level: "info", createdAt: { gte: today } } }),
    prisma.systemLog.count({ where: { status: "new" } }),
  ])

  return NextResponse.json({
    logs, total, pages: Math.ceil(total / PAGE_SIZE),
    stats: { errorsToday, warnsToday, infoToday, newTotal },
  })
}

const PatchSchema = z.object({
  ids: z.array(z.string()),
  status: z.enum(["new", "in_progress", "resolved"]),
})

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные параметры" }, { status: 400 })
  }

  const { ids, status } = parsed.data
  await prisma.systemLog.updateMany({
    where: { id: { in: ids } },
    data: {
      status,
      ...(status === "resolved" ? { resolvedAt: new Date(), resolvedBy: session.user.email } : {}),
    },
  })

  return NextResponse.json({ ok: true, updated: ids.length })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const olderThanDays = parseInt(sp.get("days") ?? "90")
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - olderThanDays)

  const result = await prisma.systemLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })

  return NextResponse.json({ deleted: result.count })
}
