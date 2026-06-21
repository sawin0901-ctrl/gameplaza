import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1") || 1)
  const action = req.nextUrl.searchParams.get("action") ?? ""
  const PAGE = 50
  const where = action ? { action: { contains: action } } : {}
  try {
    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({ where, orderBy: { createdAt: "desc" }, take: PAGE, skip: (page - 1) * PAGE }),
      prisma.adminLog.count({ where }),
    ])
    return NextResponse.json({ logs, total, pages: Math.ceil(total / PAGE) })
  } catch { return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 }) }
}