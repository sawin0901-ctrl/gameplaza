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
    const bundles = await prisma.bundle.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: { select: { name: true, price: true } } } } },
    })
    return NextResponse.json({ bundles })
  } catch { return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: { name: string; slug: string; description?: string; imageUrl?: string; price: number; productIds: string[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  if (!body.name || !body.slug || !body.price || !body.productIds?.length)
    return NextResponse.json({ error: "name, slug, price и productIds обязательны" }, { status: 422 })
  try {
    const bundle = await prisma.bundle.create({
      data: {
        name: body.name, slug: body.slug, description: body.description, imageUrl: body.imageUrl, price: body.price,
        items: { create: body.productIds.map(id => ({ productId: id })) },
      },
      include: { items: true },
    })
    await logAdmin("bundle.create", "Bundle", bundle.id, { name: body.name })
    return NextResponse.json({ bundle }, { status: 201 })
  } catch { return NextResponse.json({ error: "Ошибка создания (slug уже существует?)" }, { status: 500 }) }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: { id: string; name?: string; price?: number; isActive?: boolean; description?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 422 })
  try {
    const bundle = await prisma.bundle.update({ where: { id: body.id }, data: { name: body.name, price: body.price, isActive: body.isActive, description: body.description } })
    await logAdmin("bundle.update", "Bundle", body.id)
    return NextResponse.json({ bundle })
  } catch { return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  try {
    await prisma.bundle.delete({ where: { id } })
    await logAdmin("bundle.delete", "Bundle", id)
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 }) }
}