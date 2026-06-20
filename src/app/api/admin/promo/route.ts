import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return null
  return session
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1))
  const PAGE = 30

  const [promos, total] = await Promise.all([
    prisma.promoCode.findMany({
      orderBy: { createdAt: "desc" },
      take: PAGE,
      skip: (page - 1) * PAGE,
    }),
    prisma.promoCode.count(),
  ])

  return NextResponse.json({ promos, total, pages: Math.ceil(total / PAGE) })
}

const createSchema = z.object({
  code: z.string().min(3).max(50).regex(/^[A-Z0-9_-]+$/, "Только буквы A-Z, цифры, _ и -"),
  description: z.string().max(200).optional(),
  type: z.enum(["percent", "fixed"]),
  value: z.number().positive(),
  minOrderAmount: z.number().positive().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
})

export async function POST(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { code, description, type, value, minOrderAmount, maxUses, expiresAt } = parsed.data

  const existing = await prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } })
  if (existing) return NextResponse.json({ error: "Промокод уже существует" }, { status: 409 })

  const promo = await prisma.promoCode.create({
    data: {
      code: code.toUpperCase(),
      description: description ?? null,
      type,
      value,
      minOrderAmount: minOrderAmount ?? null,
      maxUses: maxUses ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  })

  return NextResponse.json({ promo }, { status: 201 })
}

const updateSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
  code: z.string().min(3).max(50).regex(/^[A-Z0-9_-]+$/).optional(),
  description: z.string().max(200).nullable().optional(),
  type: z.enum(["percent", "fixed"]).optional(),
  value: z.number().positive().optional(),
  minOrderAmount: z.number().positive().nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
})

export async function PATCH(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { id, ...data } = parsed.data

  try {
    const promo = await prisma.promoCode.update({ where: { id }, data })
    return NextResponse.json({ promo })
  } catch {
    return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 422 })

  await prisma.promoCode.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
