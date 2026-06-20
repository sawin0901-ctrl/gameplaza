import { Worker, Job } from "bullmq"
import { connection, importQueue, scheduleBatchImport } from "../lib/queue"
import { prisma } from "../lib/prisma"
import { getDigisellerProduct, getDigisellerProducts } from "../lib/digiseller"
import { checkProductQuality } from "../lib/quality-check"
import { processDescription } from "../lib/link-processor"
import { generateSlug } from "../lib/seo"
import { getImportSettings, applyMarkup } from "../lib/import-settings"

async function updateImportLog(field: "imported" | "errors") {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const log = await prisma.importLog.findFirst({ where: { date: { gte: today } } })
  if (log) {
    await prisma.importLog.update({
      where: { id: log.id },
      data: field === "imported" ? { imported: { increment: 1 } } : { errors: { increment: 1 } },
    })
  } else {
    await prisma.importLog.create({
      data: field === "imported" ? { imported: 1 } : { errors: 1 },
    })
  }
}

async function handleSyncCatalog() {
  const data = await getDigisellerProducts(1, 200)
  const ids = (data.rows as Array<{ id_goods: number }>).map(r => r.id_goods)

  const existing = await prisma.product.findMany({
    where: { digisellerProductId: { in: ids } },
    select: { digisellerProductId: true },
  })
  const existingSet = new Set(existing.map(e => e.digisellerProductId))
  const newIds = ids.filter(id => !existingSet.has(id))

  if (newIds.length > 0) await scheduleBatchImport(newIds)
  console.log(`[sync-catalog] Найдено ${ids.length}, добавлено в очередь ${newIds.length} новых`)
  return { found: ids.length, queued: newIds.length }
}

async function processImport(job: Job) {
  if (job.name === "sync-catalog") {
    return handleSyncCatalog()
  }

  const { productId } = job.data as { productId: number }

  await prisma.importQueue.upsert({
    where: { digisellerProductId: productId },
    update: { status: "processing", attempts: { increment: 1 } },
    create: { digisellerProductId: productId, status: "processing", attempts: 1 },
  })

  const raw = await getDigisellerProduct(productId)
  if (!raw) throw new Error(`Товар ${productId} не найден в Digiseller`)

  const quality = checkProductQuality(raw)
  if (!quality.valid) {
    await prisma.importQueue.update({
      where: { digisellerProductId: productId },
      data: { status: "skipped", lastError: quality.reasons.join(", ") },
    })
    return { skipped: true, reasons: quality.reasons }
  }

  const description = await processDescription(raw.info_goods)
  const slug = generateSlug(raw.name_goods, raw.id_goods)

  // Применяем наценку
  const settings = await getImportSettings()
  const supplierPrice = raw.price_rub
  const finalPrice = applyMarkup(supplierPrice, settings)

  const hasDiscount = raw.old_price_rub != null && raw.old_price_rub > supplierPrice
  const oldPrice = hasDiscount ? applyMarkup(raw.old_price_rub!, settings) : null
  const discountPercent =
    oldPrice && oldPrice > finalPrice
      ? Math.round((1 - finalPrice / oldPrice) * 100)
      : null

  const isAvailable = raw.status === 1 && raw.cnt_goods > 0

  const product = await prisma.product.upsert({
    where: { digisellerProductId: raw.id_goods },
    update: {
      name: raw.name_goods,
      description,
      price: finalPrice,
      oldPrice,
      discountPercent,
      imageUrl: raw.image_link ?? null,
      inStock: raw.cnt_goods > 0,
      quantity: raw.cnt_goods,
      isActive: isAvailable,
      updatedAt: new Date(),
      lastCheckedAt: new Date(),
      hiddenAt: !isAvailable ? new Date() : null,
      hideReason: raw.status !== 1 ? "Отключён продавцом" : raw.cnt_goods <= 0 ? "Нет в наличии" : null,
    },
    create: {
      digisellerProductId: raw.id_goods,
      name: raw.name_goods,
      slug,
      description,
      price: finalPrice,
      oldPrice,
      discountPercent,
      imageUrl: raw.image_link ?? null,
      inStock: raw.cnt_goods > 0,
      quantity: raw.cnt_goods,
      isActive: isAvailable,
      lastCheckedAt: new Date(),
    },
  })

  await prisma.importQueue.update({
    where: { digisellerProductId: productId },
    data: { status: "done", processedAt: new Date() },
  })

  await updateImportLog("imported")
  return { productId: product.id, slug: product.slug }
}

const worker = new Worker("product-import", processImport, {
  connection,
  concurrency: 1, // один за раз чтобы не перегружать Digiseller API
})

worker.on("failed", async (job, err) => {
  console.error(`[import] Job ${job?.id} failed:`, err.message)
  if (job?.name !== "sync-catalog") await updateImportLog("errors")

  if (job?.name === "import-product") {
    const productId = job.data?.productId as number | undefined
    if (productId) {
      await prisma.importQueue
        .update({ where: { digisellerProductId: productId }, data: { status: "failed", lastError: err.message } })
        .catch(() => {})
    }
  }
})

// Инициализация автосинхронизации при старте воркера
async function setupAutoSync() {
  try {
    const settings = await getImportSettings()
    const repeatableJobs = await importQueue.getRepeatableJobs()
    const hasSyncJob = repeatableJobs.some(j => j.name === "sync-catalog")

    if (settings.syncEnabled && !hasSyncJob) {
      await importQueue.add("sync-catalog", {}, {
        repeat: { every: settings.syncInterval * 60 * 1000 },
      })
      console.log(`[import-worker] Автосинхронизация: каждые ${settings.syncInterval} мин`)
    } else if (!settings.syncEnabled && hasSyncJob) {
      for (const job of repeatableJobs) {
        if (job.name === "sync-catalog") await importQueue.removeRepeatableByKey(job.key)
      }
      console.log("[import-worker] Автосинхронизация отключена")
    }
  } catch (err) {
    console.warn("[import-worker] Ошибка настройки автосинхронизации:", err)
  }
}

setupAutoSync()

async function shutdown(signal: string) {
  console.log(`[import-worker] ${signal} — завершаю работу...`)
  await worker.close()
  await importQueue.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

console.log("[import-worker] Запущен")
