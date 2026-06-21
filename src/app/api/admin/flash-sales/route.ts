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
    const sales = await prisma.flashSale.findMany({
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true, price: true, imageUrl: true } } },
    })
    return NextResponse.json({ sales })
  } catch { return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: { productId: string; discountValue: number; discountType: string; startAt: string; endAt: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  if (!body.productId || !body.discountValue || !body.startAt || !body.endAt)
    return NextResponse.json({ error: "Все поля обязательны" }, { status: 422 })
  try {
    const sale = await prisma.flashSale.create({
      data: { productId: body.productId, discountValue: body.discountValue, discountType: body.discountType ?? "percent", startAt: new Date(body.startAt), endAt: new Date(body.endAt) },
    })
    await logAdmin("flashsale.create", "FlashSale", sale.id, { productId: body.productId, discount: body.discountValue })
    return NextResponse.json({ sale }, { status: 201 })
  } catch { return NextResponse.json({ error: "Ошибка создания" }, { status: 500 }) }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: { id: string; isActive?: boolean; endAt?: string; discountValue?: number }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 422 })
  try {
    const sale = await prisma.flashSale.update({
      where: { id: body.id },
      data: { isActive: body.isActive, endAt: body.endAt ? new Date(body.endAt) : undefined, discountValue: body.discountValue },
    })
    await logAdmin("flashsale.update", "FlashSale", body.id)
    return NextResponse.json({ sale })
  } catch { return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  try {
    await prisma.flashSale.delete({ where: { id } })
    await logAdmin("flashsale.delete", "FlashSale", id)
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 }) }
}