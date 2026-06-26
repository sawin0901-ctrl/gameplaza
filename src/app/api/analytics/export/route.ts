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

function fmtRub(n: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n)
}

function fmtNum(n: number) { return n.toLocaleString("ru-RU") }

// ── CSV helper ────────────────────────────────────────────────────────────────
function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    if (v == null) return ""
    const s = String(v)
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.join(","), ...rows.map(r => r.map(esc).join(","))].join("\r\n")
}

// ── Word HTML report ──────────────────────────────────────────────────────────
function buildWordHtml(opts: {
  period: number
  overview: Record<string, number>
  daily: { date: string; views: number; sessions: number }[]
  sources: { name: string; value: number }[]
  topPages: { path: string; views: number }[]
  products: { name: string; purchases: number; revenue: number }[]
  utmCampaigns: { source: string; medium: string; campaign: string; views: number }[]
}) {
  const { period, overview, daily, sources, topPages, products, utmCampaigns } = opts
  const today = new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })

  // Mini horizontal bar chart (CSS)
  const maxSrc = Math.max(...sources.map(s => s.value), 1)
  const srcBars = sources.map(s =>
    `<tr><td style="padding:4px 8px;color:#555;font-size:11pt">${s.name}</td>
     <td style="padding:4px 8px;width:200px">
       <div style="height:12px;background:#e8e8e8;border-radius:6px;overflow:hidden">
         <div style="height:100%;background:#7c3aed;border-radius:6px;width:${Math.round(s.value / maxSrc * 100)}%"></div>
       </div>
     </td>
     <td style="padding:4px 8px;font-weight:600;font-size:11pt">${fmtNum(s.value)}</td></tr>`
  ).join("")

  // Daily chart (mini SVG bars)
  const maxDv = Math.max(...daily.map(d => d.views), 1)
  const barW = Math.floor(500 / daily.length) - 2
  const dailyBars = daily.map((d, i) => {
    const h = Math.max(2, Math.round((d.views / maxDv) * 60))
    const x = i * (500 / daily.length) + 1
    return `<rect x="${x.toFixed(1)}" y="${(60 - h)}" width="${barW}" height="${h}" rx="2" fill="${d.views > 0 ? "#7c3aed" : "#e5e7eb"}" opacity="0.8"/>`
  }).join("")

  const KPIS = [
    ["Просмотры страниц", fmtNum(overview.views)],
    ["Уникальных посетителей", fmtNum(overview.visitors)],
    ["Заказов", fmtNum(overview.orders)],
    ["Выручка", fmtRub(overview.revenue)],
    ["Средний чек", fmtRub(overview.avgOrder)],
    ["Конверсия", overview.conversion + "%"],
    ["Регистраций", fmtNum(overview.registrations)],
  ]

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Calibri, Arial, sans-serif; margin: 2cm; color: #1a1a1a; }
  h1 { color: #7c3aed; font-size: 22pt; margin-bottom: 4px; }
  h2 { color: #4b5563; font-size: 14pt; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #7c3aed; padding-bottom: 4px; }
  .meta { color: #9ca3af; font-size: 10pt; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #7c3aed; color: white; padding: 8px 12px; text-align: left; font-size: 10pt; }
  td { padding: 7px 12px; border-bottom: 1px solid #e5e7eb; font-size: 10pt; }
  tr:nth-child(even) td { background: #f9f7ff; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .kpi-card { background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 12px; text-align: center; }
  .kpi-val { font-size: 18pt; font-weight: bold; color: #7c3aed; }
  .kpi-lbl { font-size: 9pt; color: #6b7280; margin-top: 2px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 9pt; }
</style>
</head>
<body>
<h1>GamePlaza — Отчёт по аналитике</h1>
<p class="meta">Период: последние ${period} дней &nbsp;|&nbsp; Сгенерирован: ${today}</p>

<h2>📊 Ключевые показатели</h2>
<div class="kpi-grid">
${KPIS.map(([lbl, val]) => `<div class="kpi-card"><div class="kpi-val">${val}</div><div class="kpi-lbl">${lbl}</div></div>`).join("\n")}
</div>

<h2>📈 Посещаемость по дням</h2>
<p style="color:#6b7280;font-size:9pt;margin-bottom:8px">Просмотры страниц — каждый столбик = 1 день</p>
<svg width="500" height="70" viewBox="0 0 500 70" xmlns="http://www.w3.org/2000/svg">
  ${dailyBars}
</svg>
<table>
  <tr><th>Дата</th><th>Просмотры</th><th>Визиты</th></tr>
  ${daily.slice(-14).map(d => `<tr><td>${d.date}</td><td>${fmtNum(d.views)}</td><td>${fmtNum(d.sessions)}</td></tr>`).join("\n")}
  ${daily.length > 14 ? `<tr><td colspan="3" style="color:#9ca3af;font-style:italic">... и ещё ${daily.length - 14} дней (в Excel-версии все данные)</td></tr>` : ""}
</table>

<h2>🌐 Источники трафика</h2>
<table>
  <tr><th>Источник</th><th>Визуально</th><th>Переходов</th></tr>
  ${srcBars}
</table>

<h2>📄 Топ страниц</h2>
<table>
  <tr><th>#</th><th>Страница</th><th>Просмотры</th></tr>
  ${topPages.slice(0, 15).map((p, i) => `<tr><td>${i + 1}</td><td>${p.path}</td><td>${fmtNum(p.views)}</td></tr>`).join("\n")}
</table>

${products.length > 0 ? `
<h2>🎮 Топ товаров по продажам</h2>
<table>
  <tr><th>#</th><th>Товар</th><th>Продаж</th><th>Выручка</th></tr>
  ${products.slice(0, 10).map((p, i) => `<tr><td>${i + 1}</td><td>${p.name}</td><td>${p.purchases}</td><td>${fmtRub(p.revenue)}</td></tr>`).join("\n")}
</table>` : ""}

${utmCampaigns.length > 0 ? `
<h2>📣 UTM-кампании</h2>
<table>
  <tr><th>utm_source</th><th>utm_medium</th><th>utm_campaign</th><th>Переходов</th></tr>
  ${utmCampaigns.slice(0, 20).map(u => `<tr><td>${u.source}</td><td>${u.medium}</td><td>${u.campaign}</td><td>${u.views}</td></tr>`).join("\n")}
</table>` : ""}

<div class="footer">
  Отчёт создан автоматически · gameplaza.site/admin/analytics · ${today}
</div>
</body>
</html>`
}

// ── Excel builder (using xlsx) ─────────────────────────────────────────────────
async function buildExcel(opts: {
  period: number
  overview: Record<string, number>
  daily: { date: string; views: number; sessions: number }[]
  sources: { name: string; value: number }[]
  topPages: { path: string; views: number }[]
  products: { name: string; purchases: number; revenue: number }[]
  utmCampaigns: { source: string; medium: string; campaign: string; views: number }[]
  countries: { name: string; count: number }[]
}) {
  const XLSX = await import("xlsx")
  const wb = XLSX.utils.book_new()

  // ── Sheet 1: Summary ──────────────────────────────────────────────────────
  const summaryData = [
    ["GamePlaza — Аналитика", `Период: ${opts.period} дней`, `Дата: ${new Date().toLocaleDateString("ru-RU")}`],
    [],
    ["Показатель", "Значение"],
    ["Просмотры страниц", opts.overview.views],
    ["Уникальных посетителей", opts.overview.visitors],
    ["Просмотры сегодня", opts.overview.todayViews],
    ["Посетители сегодня", opts.overview.todayVisitors],
    ["Заказов", opts.overview.orders],
    ["Выручка (₽)", opts.overview.revenue],
    ["Средний чек (₽)", Math.round(opts.overview.avgOrder)],
    ["Конверсия (%)", opts.overview.conversion],
    ["Регистраций", opts.overview.registrations],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
  ws1["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, ws1, "📊 Сводка")

  // ── Sheet 2: Daily ───────────────────────────────────────────────────────
  const dailyData = [
    ["Дата", "Просмотры", "Визиты"],
    ...opts.daily.map(d => [d.date, d.views, d.sessions]),
  ]
  const ws2 = XLSX.utils.aoa_to_sheet(dailyData)
  ws2["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, ws2, "📈 По дням")

  // ── Sheet 3: Traffic ─────────────────────────────────────────────────────
  const srcData = [
    ["Источник трафика", "Переходов"],
    ...opts.sources.map(s => [s.name, s.value]),
  ]
  const ws3 = XLSX.utils.aoa_to_sheet(srcData)
  ws3["!cols"] = [{ wch: 25 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, ws3, "🌐 Трафик")

  // ── Sheet 4: Top pages ────────────────────────────────────────────────────
  const pagesData = [
    ["№", "Страница", "Просмотры"],
    ...opts.topPages.map((p, i) => [i + 1, p.path, p.views]),
  ]
  const ws4 = XLSX.utils.aoa_to_sheet(pagesData)
  ws4["!cols"] = [{ wch: 4 }, { wch: 45 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, ws4, "📄 Страницы")

  // ── Sheet 5: Products ─────────────────────────────────────────────────────
  if (opts.products.length > 0) {
    const prodData = [
      ["№", "Товар", "Продаж", "Выручка (₽)"],
      ...opts.products.map((p, i) => [i + 1, p.name, p.purchases, p.revenue]),
    ]
    const ws5 = XLSX.utils.aoa_to_sheet(prodData)
    ws5["!cols"] = [{ wch: 4 }, { wch: 50 }, { wch: 10 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws5, "🎮 Товары")
  }

  // ── Sheet 6: Countries ────────────────────────────────────────────────────
  if (opts.countries.length > 0) {
    const ctrData = [
      ["Страна", "Визиты"],
      ...opts.countries.map(c => [c.name, c.count]),
    ]
    const ws6 = XLSX.utils.aoa_to_sheet(ctrData)
    ws6["!cols"] = [{ wch: 25 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws6, "🌍 География")
  }

  // ── Sheet 7: UTM ──────────────────────────────────────────────────────────
  if (opts.utmCampaigns.length > 0) {
    const utmData = [
      ["utm_source", "utm_medium", "utm_campaign", "Переходов"],
      ...opts.utmCampaigns.map(u => [u.source, u.medium, u.campaign, u.views]),
    ]
    const ws7 = XLSX.utils.aoa_to_sheet(utmData)
    ws7["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 25 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws7, "📣 UTM")
  }

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const type   = searchParams.get("type") ?? "xlsx"
  const period = parseInt(searchParams.get("period") ?? "30")
  const since  = startOf(period)
  const prevSince = startOf(period * 2)

  // ── Legacy CSV types (keep for backward compat) ────────────────────────
  if (type === "pageviews" || type === "events" || type === "summary") {
    const filename = `${type}-${period}d-${new Date().toISOString().split("T")[0]}.csv`
    let csv = ""

    if (type === "pageviews") {
      const views = await prisma.pageView.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" }, take: 10000,
        select: { createdAt: true, sessionId: true, path: true, referrerType: true, referrerSource: true, keyword: true, utmSource: true, utmMedium: true, utmCampaign: true, country: true, city: true, device: true, browser: true, os: true, duration: true },
      })
      csv = toCsv(
        ["Дата", "Сессия", "Страница", "Тип трафика", "Источник", "Ключевое слово", "utm_source", "utm_medium", "utm_campaign", "Страна", "Город", "Устройство", "Браузер", "ОС", "Время (сек)"],
        views.map(v => [v.createdAt.toISOString(), v.sessionId, v.path, v.referrerType, v.referrerSource, v.keyword, v.utmSource, v.utmMedium, v.utmCampaign, v.country, v.city, v.device, v.browser, v.os, v.duration])
      )
    } else if (type === "events") {
      const events = await prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 10000,
        select: { createdAt: true, sessionId: true, event: true, path: true, productId: true, orderId: true, value: true },
      })
      csv = toCsv(
        ["Дата", "Сессия", "Событие", "Страница", "ID товара", "ID заказа", "Сумма"],
        events.map(e => [e.createdAt.toISOString(), e.sessionId, e.event, e.path, e.productId, e.orderId, e.value])
      )
    } else {
      const stats = await prisma.$queryRaw<{ day: Date; views: bigint; sessions: bigint; orders: bigint; revenue: number }[]>`
        SELECT DATE_TRUNC('day', pv."createdAt") as day, COUNT(*) as views,
          COUNT(DISTINCT pv."sessionId") as sessions,
          COALESCE((SELECT COUNT(*) FROM "AnalyticsEvent" ae WHERE ae.event='purchase' AND DATE_TRUNC('day',ae."createdAt")=DATE_TRUNC('day',pv."createdAt")),0) as orders,
          COALESCE((SELECT SUM(ae.value) FROM "AnalyticsEvent" ae WHERE ae.event='purchase' AND DATE_TRUNC('day',ae."createdAt")=DATE_TRUNC('day',pv."createdAt")),0) as revenue
        FROM "PageView" pv WHERE pv."createdAt" >= ${since}
        GROUP BY DATE_TRUNC('day', pv."createdAt") ORDER BY day DESC`
      csv = toCsv(
        ["Дата", "Просмотры", "Сессии", "Заказы", "Выручка (₽)"],
        stats.map(s => [s.day.toISOString().split("T")[0], Number(s.views), Number(s.sessions), Number(s.orders), s.revenue])
      )
    }

    return new NextResponse("﻿" + csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` },
    })
  }

  // ── Fetch full data for xlsx / word ───────────────────────────────────────
  const [
    totalViews, prevViews, allSessions, prevSessions,
    todayViews, todayVisitors,
    orders, prevOrders, registrations, prevRegistrations,
    revenueAgg, prevRevenueAgg,
    dailyRaw, sourcesRaw, pagesRaw,
    productPurchasesRaw, utmRaw, countriesRaw,
  ] = await Promise.all([
    prisma.pageView.count({ where: { createdAt: { gte: since } } }),
    prisma.pageView.count({ where: { createdAt: { gte: prevSince, lt: since } } }),
    prisma.pageView.groupBy({ by: ["sessionId"], where: { createdAt: { gte: since } }, _count: true }).then(r => r.length),
    prisma.pageView.groupBy({ by: ["sessionId"], where: { createdAt: { gte: prevSince, lt: since } }, _count: true }).then(r => r.length),
    prisma.pageView.count({ where: { createdAt: { gte: startOf(0) } } }),
    prisma.pageView.groupBy({ by: ["sessionId"], where: { createdAt: { gte: startOf(0) } }, _count: true }).then(r => r.length),
    prisma.analyticsEvent.count({ where: { event: "purchase", createdAt: { gte: since } } }),
    prisma.analyticsEvent.count({ where: { event: "purchase", createdAt: { gte: prevSince, lt: since } } }),
    prisma.analyticsEvent.count({ where: { event: "register", createdAt: { gte: since } } }),
    prisma.analyticsEvent.count({ where: { event: "register", createdAt: { gte: prevSince, lt: since } } }),
    prisma.analyticsEvent.aggregate({ where: { event: "purchase", createdAt: { gte: since } }, _sum: { value: true } }),
    prisma.analyticsEvent.aggregate({ where: { event: "purchase", createdAt: { gte: prevSince, lt: since } }, _sum: { value: true } }),
    prisma.$queryRaw<{ day: Date; views: bigint; sessions: bigint }[]>`
      SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*) as views, COUNT(DISTINCT "sessionId") as sessions
      FROM "PageView" WHERE "createdAt" >= ${since}
      GROUP BY DATE_TRUNC('day', "createdAt") ORDER BY day ASC`,
    prisma.pageView.groupBy({ by: ["referrerType"], where: { createdAt: { gte: since } }, _count: true }),
    prisma.pageView.groupBy({ by: ["path"], where: { createdAt: { gte: since }, path: { not: { startsWith: "/api/" } } }, _count: true, orderBy: { _count: { path: "desc" } }, take: 20 }),
    prisma.analyticsEvent.groupBy({ by: ["productId"], where: { event: "purchase", createdAt: { gte: since }, productId: { not: null } }, _count: true, _sum: { value: true }, orderBy: { _count: { productId: "desc" } }, take: 10 }),
    prisma.pageView.groupBy({ by: ["utmSource", "utmMedium", "utmCampaign"], where: { createdAt: { gte: since }, utmSource: { not: null } }, _count: true, orderBy: { _count: { utmSource: "desc" } }, take: 20 }),
    prisma.pageView.groupBy({ by: ["country"], where: { createdAt: { gte: since }, country: { not: null } }, _count: true, orderBy: { _count: { country: "desc" } }, take: 20 }),
  ])

  const revenue    = revenueAgg._sum.value ?? 0
  const prevRevenue = prevRevenueAgg._sum.value ?? 0
  void prevViews; void prevSessions; void prevOrders; void prevRegistrations; void prevRevenue

  // Fetch product names
  const productIds = productPurchasesRaw.map(p => p.productId!).filter(Boolean)
  const productNames = productIds.length > 0
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
    : []
  const nameMap = new Map(productNames.map(p => [p.id, p.name]))

  // Fill daily gaps
  const dailyMap = new Map(dailyRaw.map(r => [new Date(r.day).toISOString().slice(0, 10), { views: Number(r.views), sessions: Number(r.sessions) }]))
  const daily = Array.from({ length: period }, (_, i) => {
    const d = startOf(period - 1 - i)
    const key = d.toISOString().slice(0, 10)
    return { date: key, ...(dailyMap.get(key) ?? { views: 0, sessions: 0 }) }
  })

  const SOURCE_LABELS: Record<string, string> = {
    direct: "Прямые переходы", search: "Поисковые системы", social: "Социальные сети",
    referral: "Реферальные ссылки", utm: "Реклама (UTM)", internal: "Внутренние переходы",
  }
  const sources = sourcesRaw.map(s => ({ name: SOURCE_LABELS[s.referrerType ?? "direct"] ?? (s.referrerType ?? "Прямые"), value: s._count })).sort((a, b) => b.value - a.value)
  const topPages = pagesRaw.map(p => ({ path: p.path, views: p._count }))
  const products = productPurchasesRaw.map(p => ({ name: nameMap.get(p.productId!) ?? p.productId!, purchases: p._count, revenue: p._sum.value ?? 0 }))
  const utmCampaigns = utmRaw.map(u => ({ source: u.utmSource!, medium: u.utmMedium ?? "—", campaign: u.utmCampaign ?? "—", views: u._count }))
  const countries = countriesRaw.map(c => ({ name: c.country!, count: c._count }))

  const overview = {
    views: totalViews, visitors: allSessions,
    todayViews, todayVisitors,
    orders, revenue, avgOrder: orders > 0 ? revenue / orders : 0,
    registrations, conversion: allSessions > 0 ? parseFloat((orders / allSessions * 100).toFixed(2)) : 0,
  }

  const dateStr = new Date().toISOString().split("T")[0]

  // ── Excel export ──────────────────────────────────────────────────────────
  if (type === "xlsx") {
    const buf = await buildExcel({ period, overview, daily, sources, topPages, products, utmCampaigns, countries })
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="analytics-${period}d-${dateStr}.xlsx"`,
      },
    })
  }

  // ── Word export ───────────────────────────────────────────────────────────
  if (type === "word") {
    const html = buildWordHtml({ period, overview, daily, sources, topPages, products, utmCampaigns })
    return new NextResponse(html, {
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="analytics-${period}d-${dateStr}.doc"`,
      },
    })
  }

  return NextResponse.json({ error: "Неизвестный тип: " + type }, { status: 400 })
}
