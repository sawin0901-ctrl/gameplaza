import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10))
  const limit = 20

  const [logs, total, queueStats] = await Promise.all([
    prisma.importLog.findMany({
      orderBy: { date: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.importLog.count(),
    prisma.importQueue.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ])

  const queueMap = Object.fromEntries(queueStats.map(s => [s.status, s._count.status]))

  return NextResponse.json({
    logs,
    total,
    pages: Math.ceil(total / limit),
    queue: {
      pending: queueMap.pending ?? 0,
      processing: queueMap.processing ?? 0,
      done: queueMap.done ?? 0,
      skipped: queueMap.skipped ?? 0,
      failed: queueMap.failed ?? 0,
    },
  })
}
