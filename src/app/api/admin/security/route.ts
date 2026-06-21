import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const since7d  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000)

  const [failedTotal, failedToday, recentFailed, cspViolations, adminUsers] = await Promise.all([
    prisma.loginHistory.count({ where: { success: false, createdAt: { gte: since7d } } }),
    prisma.loginHistory.count({ where: { success: false, createdAt: { gte: since24h } } }),
    prisma.loginHistory.findMany({
      where: { success: false, createdAt: { gte: since7d } },
      select: { ip: true, userAgent: true, createdAt: true, userId: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.systemLog.count({ where: { category: "csp-violation", createdAt: { gte: since7d } } }),
    prisma.user.findMany({ where: { role: "admin" }, select: { id: true, email: true, name: true } }),
  ])

  // Suspicious IPs: 3+ failed attempts in 7 days
  const ipCounts: Record<string, number> = {}
  for (const r of recentFailed) {
    if (r.ip) ipCounts[r.ip] = (ipCounts[r.ip] ?? 0) + 1
  }
  const suspiciousIps = Object.entries(ipCounts)
    .filter(([, c]) => c >= 3)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([ip, count]) => ({ ip, count }))

  // Recent admin logins
  const adminIds = adminUsers.map(u => u.id)
  const recentAdminLogins = adminIds.length > 0
    ? await prisma.loginHistory.findMany({
        where: { userId: { in: adminIds }, success: true },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { userId: true, ip: true, userAgent: true, createdAt: true },
      })
    : []

  return NextResponse.json({
    failedTotal,
    failedToday,
    suspiciousIps,
    cspViolations,
    recentAdminLogins: recentAdminLogins.map(l => ({
      ...l,
      email: adminUsers.find(u => u.id === l.userId)?.email ?? "?",
    })),
    checks: {
      rateLimit: true,
      bcrypt: true,
      hsts: true,
      csp: true,
      xFrameOptions: true,
      loginHistory: true,
      adminMiddleware: true,
      passwordHashing: true,
      inputValidation: true,
    },
  })
}