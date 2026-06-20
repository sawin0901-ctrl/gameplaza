import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import { prisma } from "../../../lib/prisma"
import { z } from "zod"

const ProductIdSchema = z.object({
  productId: z.string().min(1).max(128),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const items = await prisma.wishlist.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        select: {
          id: true, slug: true, name: true, price: true,
          oldPrice: true, discountPercent: true,
          imageUrl: true, isActive: true,
          digisellerProductId: true,
          category: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = ProductIdSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный productId" }, { status: 400 })
  }

  const { productId } = parsed.data

  await prisma.wishlist.upsert({
    where: { userId_productId: { userId: session.user.id, productId } },
    create: { userId: session.user.id, productId },
    update: {},
  })

  return NextResponse.json({ ok: true, action: "added" })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const productId = req.nextUrl.searchParams.get("productId")?.trim()
  if (!productId || productId.length === 0) {
    return NextResponse.json({ error: "Некорректный productId" }, { status: 400 })
  }

  await prisma.wishlist.deleteMany({
    where: { userId: session.user.id, productId },
  })

  return NextResponse.json({ ok: true, action: "removed" })
}
