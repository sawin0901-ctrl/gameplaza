import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"
import { getDigisellerProduct } from "../../../../../lib/digiseller"
import { getImportSettings, applyMarkup } from "../../../../../lib/import-settings"
import { processDescription } from "../../../../../lib/link-processor"

export const dynamic = "force-dynamic"

const AUTO_HIDE_DAYS = 14

async function logMonitor(
  level: "info" | "warn" | "error",
  event: string,
  message: string,
  productId: string,
  productName: string,
  digiId: number,
  extra?: Record<string, unknown>
) {
  await prisma.systemLog.create({
    data: {
      level, category: "product_monitor", message, status: "new",
      details: { productId, productName, digisellerProductId: digiId, event, ...extra },
    },
  }).catch(() => {})
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { batchSize = 50, productId, checkType = "all" } = body
  const safeBatch = [50, 100, 500].includes(Number(batchSize)) ? Number(batchSize) : 50
  const settings = await getImportSettings()

  const products = await prisma.product.findMany({
    where: productId ? { id: productId } : {},
    select: {
      id: true, name: true, digisellerProductId: true,
      price: true, description: true, isActive: true, inStock: true,
      hiddenAt: true, hideReason: true,
    },
    take: safeBatch,
    orderBy: { lastCheckedAt: { sort: "asc", nulls: "first" } },
  })

  let priceChanges = 0, availabilityChanges = 0, descriptionChanges = 0
  let errors = 0, autoHidden = 0, autoPublished = 0

  for (const product of products) {
    try {
      const digi = await getDigisellerProduct(product.digisellerProductId)
      if (!digi) {
        await logMonitor("error", "fetch_error",
          `Не удалось получить данные: ${product.name}`,
          product.id, product.name, product.digisellerProductId)
        errors++
        await prisma.product.update({ where: { id: product.id }, data: { lastCheckedAt: new Date() } })
        continue
      }

      const updates: Record<string, unknown> = { lastCheckedAt: new Date() }
      const isAvailable = digi.status === 1 && digi.cnt_goods > 0

      // ── Availability ────────────────────────────────────────────
      if (checkType === "all" || checkType === "availability") {
        if (isAvailable && !product.isActive && product.hiddenAt) {
          updates.isActive = true; updates.inStock = true
          updates.hiddenAt = null; updates.hideReason = null
          availabilityChanges++; autoPublished++
          await logMonitor("info", "auto_published",
            `✅ Товар снова в наличии: ${product.name}`,
            product.id, product.name, product.digisellerProductId,
            { wasHiddenAt: product.hiddenAt?.toISOString() })
        } else if (!isAvailable && product.isActive) {
          updates.isActive = false; updates.inStock = false
          updates.hiddenAt = new Date()
          updates.hideReason = digi.status !== 1 ? "Отключён продавцом" : "Нет в наличии"
          availabilityChanges++; autoHidden++
          await logMonitor("warn", "auto_hidden",
            `⚠️ Товар скрыт: ${product.name} (${updates.hideReason})`,
            product.id, product.name, product.digisellerProductId,
            { reason: updates.hideReason })
        } else if (!isAvailable && !product.isActive && product.hiddenAt) {
          const days = (Date.now() - new Date(product.hiddenAt).getTime()) / 86400000
          if (days >= AUTO_HIDE_DAYS) {
            await logMonitor("warn", "still_unavailable",
              `⛔ Товар недоступен ${Math.floor(days)} дн.: ${product.name}`,
              product.id, product.name, product.digisellerProductId,
              { daysSinceHidden: Math.floor(days) })
          }
        }
      }

      // ── Price ───────────────────────────────────────────────────
      if ((checkType === "all" || checkType === "prices") && digi.price_rub > 0) {
        const newPrice = applyMarkup(digi.price_rub, settings)
        if (Math.abs(newPrice - product.price) >= 1) {
          updates.price = newPrice; priceChanges++
          await logMonitor("info", "price_change",
            `💱 Цена: ${product.price.toFixed(0)} → ${newPrice.toFixed(0)} ₽  ${product.name}`,
            product.id, product.name, product.digisellerProductId,
            { oldPrice: product.price, newPrice, sourcePrice: digi.price_rub })
        }
      }

      // ── Description ─────────────────────────────────────────────
      if ((checkType === "all" || checkType === "descriptions") && digi.info_goods?.trim()) {
        const newDesc = await processDescription(digi.info_goods)
        if (Math.abs(newDesc.length - product.description.length) > 100) {
          updates.description = newDesc; descriptionChanges++
          await logMonitor("info", "description_change",
            `📝 Описание обновлено: ${product.name}`,
            product.id, product.name, product.digisellerProductId,
            { oldLength: product.description.length, newLength: newDesc.length })
        }
      }

      await prisma.product.update({ where: { id: product.id }, data: updates })
    } catch (err) {
      errors++
      await logMonitor("error", "check_error",
        `❌ Ошибка проверки ${product.name}: ${err instanceof Error ? err.message : "неизвестно"}`,
        product.id, product.name, product.digisellerProductId)
      await prisma.product.update({ where: { id: product.id }, data: { lastCheckedAt: new Date() } }).catch(() => {})
    }
  }

  return NextResponse.json({ checked: products.length, priceChanges, availabilityChanges,
    descriptionChanges, errors, autoHidden, autoPublished })
}