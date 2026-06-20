import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { getDigisellerProducts } from "../../../../lib/digiseller"
import { scheduleBatchImport } from "../../../../lib/queue"

const MAX_PER_DAY = 200

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const isAdmin = session && session.user.role === "admin"
  const hasSecret = req.headers.get("x-admin-secret") === process.env.ADMIN_SECRET

  if (!isAdmin && !hasSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayLog = await prisma.importLog.findFirst({ where: { date: { gte: today } } })
  const alreadyImported = todayLog?.imported ?? 0
  const remaining = MAX_PER_DAY - alreadyImported
  if (remaining <= 0) {
    return NextResponse.json({ message: "Лимит 200 товаров на сегодня исчерпан", imported: alreadyImported })
  }

  const data = await getDigisellerProducts(1, remaining)
  const ids = data.rows.map((r: { id_goods: number }) => r.id_goods)

  const existing = await prisma.product.findMany({
    where: { digisellerProductId: { in: ids } },
    select: { digisellerProductId: true },
  })
  const existingIds = new Set(existing.map(e => e.digisellerProductId))
  const newIds = ids.filter((id: number) => !existingIds.has(id))

  if (newIds.length > 0) await scheduleBatchImport(newIds)

  return NextResponse.json({ scheduled: newIds.length, skippedExisting: ids.length - newIds.length, total: ids.length })
}
