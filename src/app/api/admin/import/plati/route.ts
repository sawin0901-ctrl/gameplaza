import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"
import { importQueue } from "../../../../../lib/queue"
import { extractPlatiId } from "../../../../../lib/plati-scraper"
import { z } from "zod"

const Schema = z.object({
  text: z.string().min(1).max(500000),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 })

  const lines = parsed.data.text.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean)
  const ids: number[] = []
  const invalid: string[] = []
  const seen = new Set<number>()

  for (const line of lines) {
    if (line.includes("funpay.com")) { invalid.push(line.slice(0, 80)); continue }
    const id = extractPlatiId(line)
    if (id && !seen.has(id)) { ids.push(id); seen.add(id) }
    else if (!id) invalid.push(line.slice(0, 80))
  }

  if (ids.length === 0)
    return NextResponse.json({
      error: "Не найдено ни одного валидного ID Plati.Market",
      invalid: invalid.slice(0, 5),
    }, { status: 400 })

  const MAX = 200
  const toProcess = ids.slice(0, MAX)
  const truncated = ids.length > MAX ? ids.length - MAX : 0

  let existing: Array<{ digisellerProductId: number; name: string | null; isActive: boolean }> = []
  try {
    existing = await prisma.product.findMany({
      where: { digisellerProductId: { in: toProcess } },
      select: { digisellerProductId: true, name: true, isActive: true },
    })
  } catch (err) {
    console.error("[import/plati] DB error:", err)
    return NextResponse.json({ error: "Ошибка базы данных" }, { status: 500 })
  }

  const existingMap = new Map(existing.map(e => [e.digisellerProductId, e]))
  const newIds = toProcess.filter(id => !existingMap.has(id))
  const duplicates = toProcess.filter(id => existingMap.has(id))

  // Add to queue
  if (newIds.length > 0) {
    const jobs = newIds.map((id, i) => ({
      name: "import-plati-product",
      data: { productId: id, source: "manual" },
      opts: { jobId: `plati-${id}`, delay: i * 3000 },
    }))
    try {
      await importQueue.addBulk(jobs)
    } catch (err) {
      console.error("[import/plati] Queue error:", err)
      return NextResponse.json({ error: "Ошибка очереди — Redis недоступен" }, { status: 500 })
    }
  }

  // Log
  if (toProcess.length > 0) {
    await prisma.platiImportLog.createMany({
      data: toProcess.map(id => ({
        id: `log-${id}-${Date.now()}`,
        url: `https://plati.market/itm/${id}`,
        productId: id,
        status: existingMap.has(id) ? "duplicate" : "queued",
        source: "manual",
      })),
      skipDuplicates: true,
    }).catch(err => console.error("[import/plati] Log error:", err))
  }

  return NextResponse.json({
    scheduled: newIds.length,
    duplicates: duplicates.length,
    duplicateList: duplicates.slice(0, 10).map(id => ({
      id, name: existingMap.get(id)?.name, active: existingMap.get(id)?.isActive,
    })),
    invalid: invalid.length,
    invalidList: invalid.slice(0, 5),
    truncated,
    total: ids.length,
  })
}