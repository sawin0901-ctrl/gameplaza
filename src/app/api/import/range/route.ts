import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { importQueue } from "../../../../lib/queue"
import { z } from "zod"

const Schema = z.object({
  fromId: z.number().int().positive(),
  toId: z.number().int().positive(),
})

const MAX_RANGE = 2000

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Укажите fromId и toId как положительные числа" }, { status: 400 })
  }

  const { fromId, toId } = parsed.data
  if (toId < fromId) {
    return NextResponse.json({ error: "toId должен быть больше или равен fromId" }, { status: 400 })
  }

  const rangeSize = toId - fromId + 1
  if (rangeSize > MAX_RANGE) {
    return NextResponse.json({
      error: `Максимальный диапазон — ${MAX_RANGE} товаров за раз. Текущий диапазон: ${rangeSize}.`,
    }, { status: 400 })
  }

  // Генерируем все ID в диапазоне
  const allIds: number[] = []
  for (let id = fromId; id <= toId; id++) allIds.push(id)

  // Проверяем дубли
  const existing = await prisma.product.findMany({
    where: { digisellerProductId: { in: allIds } },
    select: { digisellerProductId: true, name: true, isActive: true },
  })
  const existingMap = new Map(existing.map(e => [e.digisellerProductId, e]))

  const newIds = allIds.filter(id => !existingMap.has(id))
  const duplicates = allIds.filter(id => existingMap.has(id))

  // Добавляем в очередь с коротким стаггером (5с) — многие ID не существуют
  if (newIds.length > 0) {
    const jobs = newIds.map((id, i) => ({
      name: "import-product",
      data: { productId: id },
      opts: {
        jobId: `product-${id}`,
        delay: i * 5000, // 5 секунд между товарами
      },
    }))
    await importQueue.addBulk(jobs)
  }

  return NextResponse.json({
    scheduled: newIds.length,
    duplicates: duplicates.length,
    rangeSize,
    fromId,
    toId,
    estimatedMinutes: Math.ceil((newIds.length * 5) / 60),
  })
}
