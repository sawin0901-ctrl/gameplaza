import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/authOptions"
import { prisma } from "../../../../../lib/prisma"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const days = Number(body.days) || 30
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [plati, sysLog, pageViews, analytics, loginHistory] = await Promise.all([
    prisma.platiImportLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.systemLog.deleteMany({ where: { createdAt: { lt: cutoff }, status: { not: "new" } } }),
    prisma.pageView.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } } }).catch(() => ({ count: 0 })),
    prisma.analyticsEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } } }).catch(() => ({ count: 0 })),
    prisma.loginHistory.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } } }).catch(() => ({ count: 0 })),
  ])

  return NextResponse.json({
    ok: true,
    deleted: {
      platiImportLogs: plati.count,
      systemLogs: sysLog.count,
      pageViews: pageViews.count,
      analyticsEvents: analytics.count,
      loginHistory: loginHistory.count,
    },
  })
}

// Called by cron: curl -X POST https://gameplaza.site/api/admin/logs/cleanup -H "x-cron-secret: $CRON_SECRET"
export async function GET(req: Request) {
  const secret = req.headers.get ? (req as any).headers.get("x-cron-secret") : null
  if (secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const [plati, sysLog] = await Promise.all([
    prisma.platiImportLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.systemLog.deleteMany({ where: { createdAt: { lt: cutoff }, status: { not: "new" } } }),
  ])
  return NextResponse.json({ ok: true, plati: plati.count, sysLog: sysLog.count })
}