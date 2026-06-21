import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { logAdmin } from "../../../../lib/admin-log"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const banners = await prisma.banner.findMany({ orderBy: { sortOrder: "asc" } })
    return NextResponse.json({ banners })
  } catch { return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: { title: string; subtitle?: string; imageUrl: string; linkUrl?: string; sortOrder?: number }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  if (!body.title || !body.imageUrl) return NextResponse.json({ error: "title и imageUrl обязательны" }, { status: 422 })
  try {
    const banner = await prisma.banner.create({ data: { title: body.title, subtitle: body.subtitle, imageUrl: body.imageUrl, linkUrl: body.linkUrl, sortOrder: body.sortOrder ?? 0 } })
    await logAdmin("banner.create", "Banner", banner.id, { title: body.title })
    return NextResponse.json({ banner }, { status: 201 })
  } catch { return NextResponse.json({ error: "Ошибка создания" }, { status: 500 }) }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: { id: string; title?: string; subtitle?: string; imageUrl?: string; linkUrl?: string; isActive?: boolean; sortOrder?: number }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 422 })
  try {
    const banner = await prisma.banner.update({ where: { id: body.id }, data: { title: body.title, subtitle: body.subtitle, imageUrl: body.imageUrl, linkUrl: body.linkUrl, isActive: body.isActive, sortOrder: body.sortOrder } })
    await logAdmin("banner.update", "Banner", body.id)
    return NextResponse.json({ banner })
  } catch { return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  try {
    await prisma.banner.delete({ where: { id } })
    await logAdmin("banner.delete", "Banner", id)
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 }) }
}