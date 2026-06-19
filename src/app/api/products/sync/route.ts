import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { checkProductAvailability } from "../../../../lib/digiseller"

export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-secret") !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const products = await prisma.product.findMany({
    where: { lastCheckedAt: { lt: new Date(Date.now() - 6 * 60 * 60 * 1000) } },
    take: 50,
    orderBy: { lastCheckedAt: "asc" },
  })

  let hidden = 0, restored = 0

  for (const product of products) {
    const available = await checkProductAvailability(product.digisellerProductId)
    if (available && !product.isActive) {
      await prisma.product.update({
        where: { id: product.id },
        data: { isActive: true, inStock: true, hiddenAt: null, hideReason: null, lastCheckedAt: new Date() },
      })
      restored++
    } else if (!available && product.isActive) {
      await prisma.product.update({
        where: { id: product.id },
        data: { isActive: false, inStock: false, hiddenAt: new Date(), hideReason: "Недоступен", lastCheckedAt: new Date() },
      })
      hidden++
    } else {
      await prisma.product.update({ where: { id: product.id }, data: { lastCheckedAt: new Date() } })
    }
  }

  return NextResponse.json({ checked: products.length, hidden, restored })
}