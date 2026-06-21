import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../../lib/auth"
import { prisma } from "../../../../../../lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") ?? undefined
  const source = searchParams.get("source") ?? undefined
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const limit = 50
  const skip = (page - 1) * limit

  const where = {
    ...(status ? { status } : {}),
    ...(source ? { source } : {}),
  }

  const [logs, total, stats] = await Promise.all([
    prisma.platiImportLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.platiImportLog.count({ where }),
    prisma.platiImportLog.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ])

  const statMap = Object.fromEntries(stats.map(s => [s.status, s._count.id]))

  return NextResponse.json({
    logs,
    total,
    page,
    pages: Math.ceil(total / limit),
    stats: {
      queued:    statMap["queued"]    ?? 0,
      success:   statMap["success"]   ?? 0,
      updated:   statMap["updated"]   ?? 0,
      error:     statMap["error"]     ?? 0,
      not_found: statMap["not_found"] ?? 0,
      duplicate: statMap["duplicate"] ?? 0,
    },
  })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const days = Math.max(1, parseInt(searchParams.get("days") ?? "30"))
  const cutoff = new Date(Date.now() - days * 86400 * 1000)
  const { count } = await prisma.platiImportLog.deleteMany({ where: { createdAt: { lt: cutoff } } })
  return NextResponse.json({ ok: true, deleted: count })
}
