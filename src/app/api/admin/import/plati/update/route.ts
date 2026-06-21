import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../../lib/auth"
import { prisma } from "../../../../../../lib/prisma"
import { importQueue } from "../../../../../../lib/queue"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const products = await prisma.product.findMany({
    where: { importSource: "plati" },
    select: { digisellerProductId: true },
    orderBy: { lastCheckedAt: "asc" },
    take: 500,
  })

  if (products.length === 0)
    return NextResponse.json({ queued: 0, message: "Нет товаров Plati.Market для обновления" })

  const jobs = products.map((p, i) => ({
    name: "update-plati-product",
    data: { productId: p.digisellerProductId, source: "manual-update" },
    opts: {
      jobId: `plati-upd-${p.digisellerProductId}-${Date.now()}`,
      delay: i * 2000,
    },
  }))
  await importQueue.addBulk(jobs)

  return NextResponse.json({
    queued: products.length,
    estimatedMinutes: Math.ceil((products.length * 2000) / 60000),
  })
}
