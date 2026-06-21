import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../../lib/auth"
import { prisma } from "../../../../../../lib/prisma"
import { importQueue } from "../../../../../../lib/queue"

export async function POST(req: NextRequest) {
  void req
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Find all skipped log entries with their productId
  const skipped = await prisma.platiImportLog.findMany({
    where: { status: "skipped" },
    select: { productId: true, url: true },
    distinct: ["productId"],
    take: 500,
  })

  if (skipped.length === 0)
    return NextResponse.json({ queued: 0, message: "Пропущенных товаров нет" })

  // Re-queue all skipped products
  const jobs = skipped.map((s, i) => ({
    name: "import-plati-product",
    data: { productId: s.productId, source: "retry-skipped" },
    opts: { jobId: `plati-retry-${s.productId}`, delay: i * 4000 },
  }))

  await importQueue.addBulk(jobs)

  // Mark skipped logs as queued so they show up in history
  await prisma.platiImportLog.updateMany({
    where: { status: "skipped" },
    data: { status: "queued", error: null },
  })

  return NextResponse.json({
    queued: skipped.length,
    estimatedMinutes: Math.ceil((skipped.length * 4000) / 60000),
    message: `Поставлено в очередь: ${skipped.length} товаров`,
  })
}

export async function GET(req: NextRequest) {
  void req
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const count = await prisma.platiImportLog.count({ where: { status: "skipped" } })
  return NextResponse.json({ count })
}