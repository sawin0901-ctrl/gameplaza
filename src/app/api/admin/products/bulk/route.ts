import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(["activate", "deactivate", "delete"]),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }

  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { ids, action } = parsed.data

  if (action === "activate") {
    const { count } = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { isActive: true },
    })
    return NextResponse.json({ message: `Активировано: ${count} товаров`, count })
  }

  if (action === "deactivate") {
    const { count } = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { isActive: false, hiddenAt: new Date(), hideReason: "bulk_hide" },
    })
    return NextResponse.json({ message: `Скрыто: ${count} товаров`, count })
  }

  if (action === "delete") {
    const { count } = await prisma.product.deleteMany({
      where: { id: { in: ids } },
    })
    return NextResponse.json({ message: `Удалено: ${count} товаров`, count })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
