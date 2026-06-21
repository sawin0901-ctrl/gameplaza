import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { logAdmin } from "../../../../lib/admin-log"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const filter = req.nextUrl.searchParams.get("filter") ?? "all"
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1") || 1)
  const PAGE = 30
  const where = filter === "pending" ? { isApproved: false } : filter === "approved" ? { isApproved: true } : {}
  try {
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where, orderBy: { createdAt: "desc" }, take: PAGE, skip: (page - 1) * PAGE,
        include: { user: { select: { name: true, email: true } }, product: { select: { name: true, slug: true } } },
      }),
      prisma.review.count({ where }),
    ])
    return NextResponse.json({ reviews, total, pages: Math.ceil(total / PAGE) })
  } catch { return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 }) }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: { id: string; isApproved: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  try {
    const review = await prisma.review.update({ where: { id: body.id }, data: { isApproved: body.isApproved } })
    await logAdmin(body.isApproved ? "review.approve" : "review.reject", "Review", body.id)
    return NextResponse.json({ review })
  } catch { return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  try {
    await prisma.review.delete({ where: { id } })
    await logAdmin("review.delete", "Review", id)
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 }) }
}