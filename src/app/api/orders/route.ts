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

  const page = Math.max(1, Math.min(1000, parseInt(req.nextUrl.searchParams.get("page") ?? "1") || 1))
  const PAGE = 20

  try {
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
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}

const itemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1).max(500),
  price: z.number().positive(),
  digiId: z.number().int().positive(),
  imageUrl: z.string().url().optional(),
})

const createSchema = z.object({
  email: z.string().email().max(254),
  items: z.array(itemSchema).min(1).max(50),
  promoCode: z.string().max(50).optional(),
  paymentMethod: z.string().max(50).optional(),
})

// POST — create order
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { email, items, promoCode, paymentMethod } = parsed.data

  // Validate prices against DB — reject client-supplied prices
  const digiIds = items.map(i => i.digiId)
  const dbProducts = await prisma.product.findMany({
    where: { digisellerProductId: { in: digiIds }, isActive: true },
    select: { digisellerProductId: true, price: true, name: true },
  })
  const priceMap = new Map(dbProducts.map(p => [p.digisellerProductId, p.price]))

  const validatedItems = items.map(item => {
    const dbPrice = priceMap.get(item.digiId)
    if (dbPrice === undefined) return null // product not found or inactive
    return { ...item, price: dbPrice } // always use DB price, ignore client price
  })

  if (validatedItems.some(i => i === null)) {
    return NextResponse.json({ error: "Один или несколько товаров недоступны" }, { status: 400 })
  }
  const safeItems = validatedItems as NonNullable<typeof validatedItems[number]>[]

  // Validate promo code
  let promoId: string | null = null
  let discount = 0

  if (promoCode) {
    const promo = await prisma.promoCode.findFirst({
      where: {
        code: promoCode.toUpperCase(),
        isActive: true,
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
      },
    })
    if (promo && (promo.maxUses === null || promo.usedCount < promo.maxUses)) {
      promoId = promo.id
      const subtotal = safeItems.reduce((s, i) => s + i.price, 0)
      discount = promo.type === "percent"
        ? Math.round((subtotal * promo.value) / 100)
        : Math.min(promo.value, subtotal)
    }
  }

  const subtotal = safeItems.reduce((s, i) => s + i.price, 0)
  const totalAmount = Math.max(0, subtotal - discount)

  try {
    const order = await prisma.$transaction(async (tx) => {
      if (promoId) {
        const currentPromo = await tx.promoCode.findUnique({ where: { id: promoId } })
        if (!currentPromo || !currentPromo.isActive ||
            (currentPromo.maxUses !== null && currentPromo.usedCount >= currentPromo.maxUses)) {
          promoId = null
          discount = 0
        }
      }

      const newOrder = await tx.order.create({
        data: {
          userId: session?.user?.id ?? null,
          email,
          status: "pending",
          totalAmount: promoId ? Math.max(0, subtotal - discount) : subtotal,
          promoCode: promoId ? promoCode ?? null : null,
          discount: promoId ? discount : 0,
          paymentMethod: paymentMethod ?? null,
          items: {
            create: safeItems.map(i => ({
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

      if (promoId) {
        await tx.promoCode.update({
          where: { id: promoId },
          data: { usedCount: { increment: 1 } },
        })
      }

      return newOrder
    })

    prisma.dailyStats.upsert({
      where: { date: new Date(new Date().toISOString().slice(0, 10)) },
      create: { date: new Date(new Date().toISOString().slice(0, 10)), orders: 1, revenue: order.totalAmount },
      update: { orders: { increment: 1 }, revenue: { increment: order.totalAmount } },
    }).catch(() => {})

    return NextResponse.json({ order }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Ошибка при создании заказа" }, { status: 500 })
  }
}