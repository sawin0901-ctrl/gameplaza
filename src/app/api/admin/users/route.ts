import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { checkBotEmail } from "../../../../lib/bot-protection"
import { logAdmin } from "../../../../lib/admin-log"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const q    = (req.nextUrl.searchParams.get("q") ?? "").trim()
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"))
  const take = 50
  const skip = (page - 1) * take

  const where = q
    ? { OR: [
        { email: { contains: q, mode: "insensitive" as const } },
        { name:  { contains: q, mode: "insensitive" as const } },
      ] }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBlocked: true,
        balance: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.user.count({ where }),
  ])

  const enriched = users.map(u => {
    const bot = checkBotEmail(u.email)
    return { ...u, botScore: bot.score, botReasons: bot.reasons }
  })

  return NextResponse.json({ users: enriched, total, page, pages: Math.ceil(total / take) })
}

// POST /api/admin/users → bulk-block detected bots
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { action: string; ids?: string[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  if (body.action === "bulk-block-bots") {
    // Find all unblocked non-admin users with bot score ≥ 60
    const candidates = await prisma.user.findMany({
      where: { isBlocked: false, role: { not: "admin" } },
      select: { id: true, email: true },
      take: 1000,
    })

    const botIds = candidates
      .filter(u => checkBotEmail(u.email).bot)
      .map(u => u.id)

    if (botIds.length === 0) {
      return NextResponse.json({ ok: true, blocked: 0, message: "Ботов не обнаружено" })
    }

    await prisma.user.updateMany({
      where: { id: { in: botIds } },
      data: { isBlocked: true },
    })

    await logAdmin("user.bulk-block-bots", "User", "bulk", { count: botIds.length })

    return NextResponse.json({ ok: true, blocked: botIds.length, message: `Заблокировано ${botIds.length} ботов` })
  }

  if (body.action === "bulk-block" && Array.isArray(body.ids) && body.ids.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: body.ids }, role: { not: "admin" } },
      data: { isBlocked: true },
    })
    await logAdmin("user.bulk-block", "User", "bulk", { ids: body.ids })
    return NextResponse.json({ ok: true, blocked: body.ids.length })
  }

  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 })
}
