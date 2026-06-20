import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import { prisma } from "../../../lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

// GET — user's orders
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1))
  const PAGE = 20

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: PAGE,
      skip: (page - 1) * PAGE,
      include: { items: { select: { name: true, price: true, digiId: true, imageUrl: true } } },
    }),
    prisma.order.count({ where: { userId: session.user.id } }),
  ])

  return NextResponse.json({ orders, total, pages: Math.ceil(total / PAGE) })
}

const itemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1).max(500),
  price: z.number().positive(),
  digiId: z.number().int().positive(),
  imageUrl: z.string().url().optional(),
})

const createSchema = z.object({
  email: z.string().email(),
  items: z.array(itemSchema).min(1).max(50),
  promoCode: z.string().max(50).optional(),
  paymentMethod: z.string().max(50).optional(),
})

// POST — create order
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { email, items, promoCode, paymentMethod } = parsed.data

  let discount = 0
  let promoId: string | null = null

  // Apply promo code
  if (promoCode) {
    const promo = await prisma.promoCode.findFirst({
      where: {
        code: promoCode.toUpperCase(),
        isActive: true,
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        ],
      },
    })
    // Check maxUses in JS (Prisma can't compare two fields in same row)
    if (promo && (promo.maxUses === null || promo.usedCount < promo.maxUses)) {
      promoId = promo.id
      const subtotal = items.reduce((s, i) => s + i.price, 0)
      discount = promo.type === "percent"
        ? Math.round((subtotal * promo.value) / 100)
        : Math.min(promo.value, subtotal)
    }
  }

  const subtotal = items.reduce((s, i) => s + i.price, 0)
  const totalAmount = Math.max(0, subtotal - discount)

  const order = await prisma.order.create({
    data: {
      userId: session?.user?.id ?? null,
      email,
      status: "pending",
      totalAmount,
      promoCode: promoCode ?? null,
      discount,
      paymentMethod: paymentMethod ?? null,
      items: {
        create: items.map(i => ({
          productId: i.productId ?? null,
          name: i.name,
          price: i.price,
          digiId: i.digiId,
          imageUrl: i.imageUrl ?? null,
        })),
      },
    },
    include: { items: true },
  })

  // Increment promo usage
  if (promoId) {
    await prisma.promoCode.update({ where: { id: promoId }, data: { usedCount: { increment: 1 } } })
  }

  // Update DailyStats
  prisma.dailyStats.upsert({
    where: { date: new Date(new Date().toISOString().slice(0, 10)) },
    create: { date: new Date(new Date().toISOString().slice(0, 10)), orders: 1, revenue: totalAmount },
    update: { orders: { increment: 1 }, revenue: { increment: totalAmount } },
  }).catch(() => {})

  return NextResponse.json({ order }, { status: 201 })
}