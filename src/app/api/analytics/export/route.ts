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

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) => {
    if (v == null) return ""
    const s = String(v)
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  return [
    headers.join(","),
    ...rows.map(row => row.map(escape).join(",")),
  ].join("\r\n")
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const type = searchParams.get("type") ?? "pageviews"
  const period = parseInt(searchParams.get("period") ?? "30")
  const since = startOf(period)

  let csv = ""
  let filename = ""

  if (type === "pageviews") {
    const views = await prisma.pageView.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 10000,
      select: {
        createdAt: true, sessionId: true, path: true,
        referrerType: true, referrerSource: true, keyword: true,
        utmSource: true, utmMedium: true, utmCampaign: true,
        country: true, city: true, device: true, browser: true, os: true, duration: true,
      },
    })
    csv = toCsv(
      ["Дата", "Сессия", "Страница", "Тип трафика", "Источник", "Ключевое слово", "utm_source", "utm_medium", "utm_campaign", "Страна", "Город", "Устройство", "Браузер", "ОС", "Время (сек)"],
      views.map(v => [
        v.createdAt.toISOString(), v.sessionId, v.path,
        v.referrerType, v.referrerSource, v.keyword,
        v.utmSource, v.utmMedium, v.utmCampaign,
        v.country, v.city, v.device, v.browser, v.os, v.duration,
      ])
    )
    filename = `pageviews-${period}d-${new Date().toISOString().split("T")[0]}.csv`
  } else if (type === "events") {
    const events = await prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 10000,
      select: {
        createdAt: true, sessionId: true, event: true, path: true,
        productId: true, orderId: true, value: true,
      },
    })
    csv = toCsv(
      ["Дата", "Сессия", "Событие", "Страница", "ID товара", "ID заказа", "Сумма"],
      events.map(e => [e.createdAt.toISOString(), e.sessionId, e.event, e.path, e.productId, e.orderId, e.value])
    )
    filename = `events-${period}d-${new Date().toISOString().split("T")[0]}.csv`
  } else if (type === "summary") {
    // Daily summary
    const stats = await prisma.$queryRaw<{
      day: Date; views: bigint; sessions: bigint; orders: bigint; revenue: number
    }[]>`
      SELECT
        DATE_TRUNC('day', pv."createdAt") as day,
        COUNT(*) as views,
        COUNT(DISTINCT pv."sessionId") as sessions,
        COALESCE((
          SELECT COUNT(*) FROM "AnalyticsEvent" ae
          WHERE ae.event = 'purchase'
          AND DATE_TRUNC('day', ae."createdAt") = DATE_TRUNC('day', pv."createdAt")
        ), 0) as orders,
        COALESCE((
          SELECT SUM(ae.value) FROM "AnalyticsEvent" ae
          WHERE ae.event = 'purchase'
          AND DATE_TRUNC('day', ae."createdAt") = DATE_TRUNC('day', pv."createdAt")
        ), 0) as revenue
      FROM "PageView" pv
      WHERE pv."createdAt" >= ${since}
      GROUP BY DATE_TRUNC('day', pv."createdAt")
      ORDER BY day DESC
    `
    csv = toCsv(
      ["Дата", "Просмотры", "Сессии", "Заказы", "Выручка (₽)"],
      stats.map(s => [s.day.toISOString().split("T")[0], Number(s.views), Number(s.sessions), Number(s.orders), s.revenue])
    )
    filename = `summary-${period}d-${new Date().toISOString().split("T")[0]}.csv`
  } else {
    return NextResponse.json({ error: "Неизвестный тип экспорта" }, { status: 400 })
  }

  // BOM for Excel UTF-8
  const bom = "﻿"
  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
