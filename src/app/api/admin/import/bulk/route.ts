import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"
import { importQueue } from "../../../../../lib/queue"
import { parseInputList } from "../../../../../lib/import-url-parser"
import { z } from "zod"

const Schema = z.object({
  text: z.string().min(1).max(100000),
})

const MAX_IDS = 500

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 })
  }

  const { ids, unsupported, funpay, total } = parseInputList(parsed.data.text)

  if (ids.length === 0) {
    return NextResponse.json({
      scheduled: 0, duplicates: 0, unsupported: unsupported.length,
      funpay, total,
      error: funpay > 0
        ? "FunPay не поддерживается — товары FunPay нельзя импортировать через Digiseller API"
        : "Не найдено ни одного поддерживаемого ID товара. Используйте ID с Digiseller или plati.market",
    }, { status: 400 })
  }

  const toProcess = ids.slice(0, MAX_IDS)
  const truncated = ids.length > MAX_IDS ? ids.length - MAX_IDS : 0

  // Проверка дублей
  const existing = await prisma.product.findMany({
    where: { digisellerProductId: { in: toProcess } },
    select: { digisellerProductId: true, name: true, isActive: true },
  })
  const existingMap = new Map(existing.map(e => [e.digisellerProductId, e]))

  const newIds = toProcess.filter(id => !existingMap.has(id))
  const duplicates = toProcess.filter(id => existingMap.has(id))

  // Пакетное добавление в очередь (стаггер 15 сек между товарами)
  if (newIds.length > 0) {
    const jobs = newIds.map((id, i) => ({
      name: "import-product",
      data: { productId: id },
      opts: { jobId: `product-${id}`, delay: i * 15 * 1000 },
    }))
    await importQueue.addBulk(jobs)
  }

  return NextResponse.json({
    scheduled: newIds.length,
    duplicates: duplicates.length,
    duplicateList: duplicates.slice(0, 10).map(id => ({
      id,
      name: existingMap.get(id)?.name,
      active: existingMap.get(id)?.isActive,
    })),
    unsupported: unsupported.length,
    unsupportedList: unsupported.slice(0, 5),
    funpay,
    total: ids.length,
    truncated,
  })
}
