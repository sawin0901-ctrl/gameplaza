import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { logAdmin } from "../../../../lib/admin-log"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1") || 1)
  const PAGE = 30
  try {
    const [codes, total] = await Promise.all([
      prisma.referralCode.findMany({
        orderBy: { usedCount: "desc" }, take: PAGE, skip: (page - 1) * PAGE,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.referralCode.count(),
    ])
    return NextResponse.json({ codes, total, pages: Math.ceil(total / PAGE) })
  } catch { return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: { userId: string; code?: string; bonusAmount?: number }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  if (!body.userId) return NextResponse.json({ error: "userId обязателен" }, { status: 422 })
  const code = body.code?.toUpperCase() ?? Math.random().toString(36).slice(2, 8).toUpperCase()
  try {
    const ref = await prisma.referralCode.create({
      data: { userId: body.userId, code, bonusAmount: body.bonusAmount ?? 50 },
    })
    await logAdmin("referral.create", "ReferralCode", ref.id, { code })
    return NextResponse.json({ ref }, { status: 201 })
  } catch { return NextResponse.json({ error: "Код уже существует" }, { status: 409 }) }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: { id: string; isActive?: boolean; bonusAmount?: number }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 422 })
  try {
    const ref = await prisma.referralCode.update({ where: { id: body.id }, data: { isActive: body.isActive, bonusAmount: body.bonusAmount } })
    await logAdmin("referral.update", "ReferralCode", body.id)
    return NextResponse.json({ ref })
  } catch { return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  try {
    await prisma.referralCode.delete({ where: { id } })
    await logAdmin("referral.delete", "ReferralCode", id)
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 }) }
}