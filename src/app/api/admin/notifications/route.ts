import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [tickets, sysErrors, cspViolations, importErrors] = await Promise.all([
    prisma.ticket.count({ where: { status: "open" } }).catch(() => 0),
    prisma.systemLog.count({ where: { level: "error", status: "new", createdAt: { gte: since24h } } }).catch(() => 0),
    prisma.systemLog.count({ where: { category: "csp-violation", status: "new" } }).catch(() => 0),
    prisma.platiImportLog.count({ where: { status: "error", createdAt: { gte: since24h } } }).catch(() => 0),
  ])

  const total = tickets + sysErrors + cspViolations + importErrors

  return NextResponse.json({
    total,
    items: [
      tickets > 0 && { type: "ticket", count: tickets, label: "Открытых тикетов", href: "/admin/tickets", icon: "💬" },
      sysErrors > 0 && { type: "error", count: sysErrors, label: "Системных ошибок (24ч)", href: "/admin/monitoring", icon: "🔴" },
      cspViolations > 0 && { type: "csp", count: cspViolations, label: "CSP нарушений", href: "/admin/security", icon: "🛡️" },
      importErrors > 0 && { type: "import", count: importErrors, label: "Ошибок импорта (24ч)", href: "/admin/import/plati", icon: "⚠️" },
    ].filter(Boolean),
  })
}