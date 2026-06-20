import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import { prisma } from "../../../lib/prisma"
import { importQueue } from "../../../lib/queue"

export async function GET(req: NextRequest) {
  // Доступ только администраторам или по секретному ключу (для мониторинг-систем)
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user?.role === "admin"
  const secret = process.env.ADMIN_SECRET
  const hasSecret = secret && req.headers.get("x-admin-secret") === secret

  if (!isAdmin && !hasSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [totalProducts, activeProducts, hiddenProducts, queuedItems, todayLog, queueStats] =
    await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: false } }),
      prisma.importQueue.count({ where: { status: "pending" } }),
      prisma.importLog.findFirst({ orderBy: { date: "desc" } }),
      importQueue.getJobCounts("waiting", "active", "failed"),
    ])

  return NextResponse.json({
    products: { total: totalProducts, active: activeProducts, hidden: hiddenProducts },
    queue: {
      db: queuedItems,
      waiting: queueStats.waiting,
      active: queueStats.active,
      failed: queueStats.failed,
    },
    today: {
      imported: todayLog?.imported ?? 0,
      updated: todayLog?.updated ?? 0,
      errors: todayLog?.errors ?? 0,
    },
  })
}
