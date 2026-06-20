import { NextRequest, NextResponse } from "next/server"
import { prisma } from "../../../../lib/prisma"
import { checkProductAvailability } from "../../../../lib/digiseller"
import { revalidatePath } from "next/cache"

export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET
  // Защита: если секрет не задан или пустой — запрещаем доступ
  if (!secret || req.headers.get("x-admin-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const products = await prisma.product.findMany({
    where: { lastCheckedAt: { lt: new Date(Date.now() - 6 * 60 * 60 * 1000) } },
    take: 50,
    orderBy: { lastCheckedAt: "asc" },
  })

  let hidden = 0, restored = 0
  const now = new Date()

  // Результаты проверок собираем параллельно
  const results = await Promise.allSettled(
    products.map(p => checkProductAvailability(p.digisellerProductId).then(av => ({ p, av })))
  )

  // Пакетные обновления через транзакцию вместо N+1 запросов
  const updates = results
    .filter((r): r is PromiseFulfilledResult<{ p: (typeof products)[0]; av: boolean }> => r.status === "fulfilled")
    .map(({ value: { p, av } }) => {
      if (av && !p.isActive) {
        restored++
        return prisma.product.update({
          where: { id: p.id },
          data: { isActive: true, inStock: true, hiddenAt: null, hideReason: null, lastCheckedAt: now },
        })
      } else if (!av && p.isActive) {
        hidden++
        return prisma.product.update({
          where: { id: p.id },
          data: { isActive: false, inStock: false, hiddenAt: now, hideReason: "Недоступен", lastCheckedAt: now },
        })
      } else {
        return prisma.product.update({ where: { id: p.id }, data: { lastCheckedAt: now } })
      }
    })

  await prisma.$transaction(updates)

  if (hidden > 0 || restored > 0) {
    revalidatePath("/catalog")
    revalidatePath("/")
  }

  const failed = results.filter(r => r.status === "rejected").length
  return NextResponse.json({ checked: products.length, hidden, restored, failed })
}
