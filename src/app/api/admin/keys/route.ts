import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { logAdmin } from "../../../../lib/admin-log"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const productId = req.nextUrl.searchParams.get("productId") ?? ""
  const filter = req.nextUrl.searchParams.get("filter") ?? "all"
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1") || 1)
  const PAGE = 50
  const where = {
    ...(productId ? { productId } : {}),
    ...(filter === "used" ? { isUsed: true } : filter === "free" ? { isUsed: false } : {}),
  }
  try {
    const [keys, total] = await Promise.all([
      prisma.productKey.findMany({ where, orderBy: { createdAt: "desc" }, take: PAGE, skip: (page - 1) * PAGE, include: { product: { select: { name: true } } } }),
      prisma.productKey.count({ where }),
    ])
    const stats = await prisma.productKey.groupBy({ by: ["productId"], _count: true, where: { isUsed: false } })
    return NextResponse.json({ keys, total, pages: Math.ceil(total / PAGE), freeByProduct: stats })
  } catch { return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  let body: { productId: string; keys: string[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  if (!body.productId || !Array.isArray(body.keys) || body.keys.length === 0)
    return NextResponse.json({ error: "productId и массив keys обязательны" }, { status: 422 })
  const unique = [...new Set(body.keys.map(k => k.trim()).filter(Boolean))]
  try {
    const created = await prisma.productKey.createMany({
      data: unique.map(k => ({ productId: body.productId, keyValue: k })), skipDuplicates: true,
    })
    await logAdmin("keys.upload", "ProductKey", body.productId, { count: created.count })
    return NextResponse.json({ created: created.count }, { status: 201 })
  } catch { return NextResponse.json({ error: "Ошибка загрузки ключей" }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  try {
    await prisma.productKey.delete({ where: { id } })
    await logAdmin("keys.delete", "ProductKey", id)
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 }) }
}