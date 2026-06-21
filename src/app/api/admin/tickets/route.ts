import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { logAdmin } from "../../../../lib/admin-log"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const status = req.nextUrl.searchParams.get("status") ?? "all"
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1") || 1)
  const PAGE = 30
  const where = status !== "all" ? { status } : {}
  try {
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where, orderBy: { updatedAt: "desc" }, take: PAGE, skip: (page - 1) * PAGE,
        include: { messages: { orderBy: { createdAt: "asc" } }, user: { select: { name: true, email: true } } },
      }),
      prisma.ticket.count({ where }),
    ])
    return NextResponse.json({ tickets, total, pages: Math.ceil(total / PAGE) })
  } catch { return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: { ticketId: string; text: string } | { action: "close" | "open"; ticketId: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  try {
    if ("action" in body) {
      const t = await prisma.ticket.update({ where: { id: body.ticketId }, data: { status: body.action === "close" ? "closed" : "open" } })
      await logAdmin(`ticket.${body.action}`, "Ticket", body.ticketId)
      return NextResponse.json({ ticket: t })
    }
    const msg = await prisma.ticketMessage.create({ data: { ticketId: body.ticketId, isAdmin: true, text: body.text } })
    await prisma.ticket.update({ where: { id: body.ticketId }, data: { updatedAt: new Date() } })
    return NextResponse.json({ message: msg }, { status: 201 })
  } catch { return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 }) }
}