import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"

export const dynamic = "force-dynamic"

function startOf(daysAgo: number) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const period = parseInt(searchParams.get("period") ?? "30")
  const since = startOf(period)
  const prevSince = startOf(period * 2)
  const today = startOf(0)
  const yesterday = startOf(1)

  const [
    // Overview counts
    totalViews,
    prevViews,
    todayViews,
    yesterdayViews,

    // Unique sessions
    allSessions,
    prevSessions,
    todaySessions,
    yesterdaySessions,

    // Events
    orders,
    prevOrders,
    registrations,
    prevRegistrations,

    // Revenue
    revenueAgg,
    prevRevenueAgg,

    // Daily breakdown (30 days)
    dailyRaw,

    // Traffic sources
    sourcesRaw,

    // Top pages
    pagesRaw,

    // Devices
    devicesRaw,
    browsersRaw,
    osRaw,

    // Countries
    countriesRaw,

    // UTM campaigns
    utmRaw,

    // Keywords
    keywordsRaw,

    // Product analytics
    productViewsRaw,
    productPurchasesRaw,
  ] = await Promise.all([
    // Page views
    prisma.pageView.count({ where: { createdAt: { gte: since } } }),
    prisma.pageView.count({ where: { createdAt: { gte: prevSince, lt: since } } }),
    prisma.pageView.count({ where: { createdAt: { gte: today } } }),
    prisma.pageView.count({ where: { createdAt: { gte: yesterday, lt: today } } }),

    // Sessions (unique sessionIds)
    prisma.pageView.groupBy({ by: ["sessionId"], where: { createdAt: { gte: since } }, _count: true }).then(r => r.length),
    prisma.pageView.groupBy({ by: ["sessionId"], where: { createdAt: { gte: prevSince, lt: since } }, _count: true }).then(r => r.length),
    prisma.pageView.groupBy({ by: ["sessionId"], where: { createdAt: { gte: today } }, _count: true }).then(r => r.length),
    prisma.pageView.groupBy({ by: ["sessionId"], where: { createdAt: { gte: yesterday, lt: today } }, _count: true }).then(r => r.length),

    // Orders
    prisma.analyticsEvent.count({ where: { event: "purchase", createdAt: { gte: since } } }),
    prisma.analyticsEvent.count({ where: { event: "purchase", createdAt: { gte: prevSince, lt: since } } }),
    prisma.analyticsEvent.count({ where: { event: "register", createdAt: { gte: since } } }),
    prisma.analyticsEvent.count({ where: { event: "register", createdAt: { gte: prevSince, lt: since } } }),

    // Revenue
    prisma.analyticsEvent.aggregate({ where: { event: "purchase", createdAt: { gte: since } }, _sum: { value: true } }),
    prisma.analyticsEvent.aggregate({ where: { event: "purchase", createdAt: { gte: prevSince, lt: since } }, _sum: { value: true } }),

    // Daily views for chart
    prisma.$queryRaw<{ day: Date; views: bigint; sessions: bigint }[]>`
      SELECT
        DATE_TRUNC('day', "createdAt") as day,
        COUNT(*) as views,
        COUNT(DISTINCT "sessionId") as sessions
      FROM "PageView"
      WHERE "createdAt" >= ${since}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY day ASC
    `,

    // Traffic sources
    prisma.pageView.groupBy({
      by: ["referrerType", "referrerSource"],
      where: { createdAt: { gte: since } },
      _count: true,
      orderBy: { _count: { referrerType: "desc" } },
    }),

    // Top pages
    prisma.pageView.groupBy({
      by: ["path"],
      where: { createdAt: { gte: since }, path: { not: { startsWith: "/api/" } } },
      _count: true,
      orderBy: { _count: { path: "desc" } },
      take: 20,
    }),

    // Devices
    prisma.pageView.groupBy({ by: ["device"], where: { createdAt: { gte: since } }, _count: true }),
    prisma.pageView.groupBy({ by: ["browser"], where: { createdAt: { gte: since } }, _count: true }),
    prisma.pageView.groupBy({ by: ["os"], where: { createdAt: { gte: since } }, _count: true }),

    // Countries
    prisma.pageView.groupBy({
      by: ["country"],
      where: { createdAt: { gte: since }, country: { not: null } },
      _count: true,
      orderBy: { _count: { country: "desc" } },
      take: 20,
    }),

    // UTM campaigns
    prisma.pageView.groupBy({
      by: ["utmSource", "utmMedium", "utmCampaign"],
      where: { createdAt: { gte: since }, utmSource: { not: null } },
      _count: true,
      orderBy: { _count: { utmSource: "desc" } },
      take: 20,
    }),

    // Search keywords
    prisma.pageView.groupBy({
      by: ["keyword"],
      where: { createdAt: { gte: since }, keyword: { not: null } },
      _count: true,
      orderBy: { _count: { keyword: "desc" } },
      take: 20,
    }),

    // Product views
    prisma.analyticsEvent.groupBy({
      by: ["productId"],
      where: { event: "product_view", createdAt: { gte: since }, productId: { not: null } },
      _count: true,
      orderBy: { _count: { productId: "desc" } },
      take: 10,
    }),

    // Product purchases
    prisma.analyticsEvent.groupBy({
      by: ["productId"],
      where: { event: "purchase", createdAt: { gte: since }, productId: { not: null } },
      _count: true,
      _sum: { value: true },
      orderBy: { _count: { productId: "desc" } },
      take: 10,
    }),
  ])

  // Fetch product names for product analytics
  const productIds = [...new Set([
    ...productViewsRaw.map(p => p.productId!),
    ...productPurchasesRaw.map(p => p.productId!),
  ])]
  const products = productIds.length > 0 ? await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, slug: true, price: true },
  }) : []
  const productMap = new Map(products.map(p => [p.id, p]))

  // Calc % change helper
  function pct(cur: number, prev: number) {
    if (prev === 0) return cur > 0 ? 100 : 0
    return Math.round(((cur - prev) / prev) * 100)
  }

  const revenue = revenueAgg._sum.value ?? 0
  const prevRevenue = prevRevenueAgg._sum.value ?? 0
  const avgOrder = orders > 0 ? revenue / orders : 0

  // Build daily chart data (fill missing days with 0)
  const dailyMap = new Map<string, { views: number; sessions: number }>()
  for (const row of dailyRaw) {
    const key = new Date(row.day).toISOString().split("T")[0]
    dailyMap.set(key, { views: Number(row.views), sessions: Number(row.sessions) })
  }
  const daily: { date: string; views: number; sessions: number }[] = []
  for (let i = period - 1; i >= 0; i--) {
    const d = startOf(i)
    const key = d.toISOString().split("T")[0]
    const row = dailyMap.get(key) ?? { views: 0, sessions: 0 }
    daily.push({ date: key, ...row })
  }

  // Process traffic sources
  const sourcesByType: Record<string, { source: string; count: number }[]> = {}
  for (const row of sourcesRaw) {
    const type = row.referrerType ?? "direct"
    if (!sourcesByType[type]) sourcesByType[type] = []
    sourcesByType[type].push({ source: row.referrerSource ?? "Прямой", count: row._count })
  }
  // Sort each group
  for (const type in sourcesByType) {
    sourcesByType[type].sort((a, b) => b.count - a.count)
  }

  return NextResponse.json({
    period,
    overview: {
      views: { current: totalViews, prev: prevViews, change: pct(totalViews, prevViews) },
      visitors: { current: allSessions, prev: prevSessions, change: pct(allSessions, prevSessions) },
      todayViews: { current: todayViews, prev: yesterdayViews, change: pct(todayViews, yesterdayViews) },
      todayVisitors: { current: todaySessions, prev: yesterdaySessions, change: pct(todaySessions, yesterdaySessions) },
      orders: { current: orders, prev: prevOrders, change: pct(orders, prevOrders) },
      revenue: { current: revenue, prev: prevRevenue, change: pct(revenue, prevRevenue) },
      avgOrder,
      registrations: { current: registrations, prev: prevRegistrations, change: pct(registrations, prevRegistrations) },
      conversion: allSessions > 0 ? parseFloat((orders / allSessions * 100).toFixed(2)) : 0,
    },
    daily,
    sources: sourcesByType,
    topPages: pagesRaw.map(p => ({ path: p.path, views: p._count })),
    devices: devicesRaw.map(d => ({ name: d.device ?? "Other", count: d._count })).sort((a, b) => b.count - a.count),
    browsers: browsersRaw.map(b => ({ name: b.browser ?? "Other", count: b._count })).sort((a, b) => b.count - a.count),
    os: osRaw.map(o => ({ name: o.os ?? "Other", count: o._count })).sort((a, b) => b.count - a.count),
    countries: countriesRaw.map(c => ({ name: c.country!, count: c._count })),
    utmCampaigns: utmRaw.map(u => ({
      source: u.utmSource!,
      medium: u.utmMedium ?? "—",
      campaign: u.utmCampaign ?? "—",
      views: u._count,
    })),
    keywords: keywordsRaw.map(k => ({ keyword: k.keyword!, count: k._count })),
    productViews: productViewsRaw.map(p => ({
      productId: p.productId!,
      name: productMap.get(p.productId!)?.name ?? p.productId!,
      slug: productMap.get(p.productId!)?.slug ?? "",
      views: p._count,
    })),
    productPurchases: productPurchasesRaw.map(p => ({
      productId: p.productId!,
      name: productMap.get(p.productId!)?.name ?? p.productId!,
      purchases: p._count,
      revenue: p._sum.value ?? 0,
    })),
  })
}
