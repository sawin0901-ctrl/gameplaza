import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../../lib/auth"
import { prisma } from "../../../../../../lib/prisma"
import { importQueue } from "../../../../../../lib/queue"
import { z } from "zod"

const Schema = z.object({
  from: z.number().int().min(10000).max(99999999),
  to: z.number().int().min(10000).max(99999999),
})

const MAX_RANGE = 500

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: "Некорректные данные. Укажите from и to (числа от 10000 до 99999999)" }, { status: 400 })

  const { from, to } = parsed.data
  if (from > to)
    return NextResponse.json({ error: "from должен быть меньше или равен to" }, { status: 400 })

  const rangeSize = to - from + 1
  if (rangeSize > MAX_RANGE)
    return NextResponse.json({
      error: `Диапазон слишком большой: ${rangeSize} ID. Максимум ${MAX_RANGE}. Разбейте на несколько запросов.`,
    }, { status: 400 })

  const allIds = Array.from({ length: rangeSize }, (_, i) => from + i)

  // Skip already imported
  const existing = await prisma.product.findMany({
    where: { digisellerProductId: { in: allIds } },
    select: { digisellerProductId: true },
  })
  const existingSet = new Set(existing.map(e => e.digisellerProductId))
  const newIds = allIds.filter(id => !existingSet.has(id))

  if (newIds.length === 0)
    return NextResponse.json({ scheduled: 0, skipped: allIds.length, message: "Все товары из диапазона уже импортированы" })

  const jobs = newIds.map((id, i) => ({
    name: "import-plati-product",
    data: { productId: id, source: "range" },
    opts: { jobId: `plati-${id}`, delay: i * 4000 },
  }))
  await importQueue.addBulk(jobs)

  await prisma.platiImportLog.createMany({
    data: newIds.map(id => ({
      id: `log-${id}-${Date.now()}`,
      url: `https://plati.market/itm/${id}`,
      productId: id,
      status: "queued",
      source: "range",
    })),
    skipDuplicates: true,
  })

  return NextResponse.json({
    scheduled: newIds.length,
    skipped: existing.length,
    total: rangeSize,
    estimatedMinutes: Math.ceil((newIds.length * 4000) / 60000),
  })
}
