import { Worker, Job } from "bullmq"
import { connection, importQueue, scheduleBatchImport } from "../lib/queue"
import { prisma } from "../lib/prisma"
import { getDigisellerProduct, getDigisellerProducts } from "../lib/digiseller"
import { scrapePlatiProduct } from "../lib/plati-scraper"
import { downloadImage, downloadImages } from "../lib/image-downloader"
import { checkProductQuality } from "../lib/quality-check"
import { processDescription } from "../lib/link-processor"
import { generateSlug } from "../lib/seo"
import { getImportSettings, applyMarkup } from "../lib/import-settings"
import { generateSeoForProduct } from "../lib/seo-generator"

async function updateImportLog(field: "imported" | "errors" | "updated") {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const log = await prisma.importLog.findFirst({ where: { date: { gte: today } } })
  if (log) {
    await prisma.importLog.update({
      where: { id: log.id },
      data:
        field === "imported" ? { imported: { increment: 1 } }
        : field === "updated"  ? { updated:  { increment: 1 } }
        : { errors: { increment: 1 } },
    })
  } else {
    await prisma.importLog.create({
      data:
        field === "imported" ? { imported: 1 }
        : field === "updated"  ? { updated: 1 }
        : { errors: 1 },
    })
  }
}

// ── Digiseller catalog sync ────────────────────────────────────────────────────
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
  console.log(`[sync-catalog] Found ${ids.length}, queued ${newIds.length} new`)
  return { found: ids.length, queued: newIds.length }
}

// ── Plati.Market catalog auto-update ─────────────────────────────────────────
async function handleSyncPlatiCatalog() {
  const products = await prisma.product.findMany({
    where: { importSource: "plati", isActive: true },
    select: { digisellerProductId: true },
    take: 500,
  })
  if (products.length === 0) return { found: 0, queued: 0 }

  const jobs = products.map((p, i) => ({
    name: "update-plati-product",
    data: { productId: p.digisellerProductId, source: "auto-update" },
    opts: { jobId: `plati-upd-${p.digisellerProductId}-${Date.now()}`, delay: i * 2500 },
  }))
  await importQueue.addBulk(jobs)
  console.log(`[sync-plati] Queued ${products.length} product updates`)
  return { found: products.length, queued: products.length }
}

// ── Import Digiseller product ─────────────────────────────────────────────────
async function processDigisellerImport(job: Job) {
  const { productId } = job.data as { productId: number }

  await prisma.importQueue.upsert({
    where: { digisellerProductId: productId },
    update: { status: "processing", attempts: { increment: 1 } },
    create: { digisellerProductId: productId, status: "processing", attempts: 1 },
  })

  const raw = await getDigisellerProduct(productId)
  if (!raw) throw new Error(`Product ${productId} not found in Digiseller`)

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
  const settings = await getImportSettings()
  const finalPrice = applyMarkup(raw.price_rub, settings)
  const hasDiscount = raw.old_price_rub != null && raw.old_price_rub > raw.price_rub
  const oldPrice = hasDiscount ? applyMarkup(raw.old_price_rub!, settings) : null
  const discountPercent = oldPrice && oldPrice > finalPrice
    ? Math.round((1 - finalPrice / oldPrice) * 100) : null
  const isAvailable = raw.status === 1 && raw.cnt_goods > 0

  const product = await prisma.product.upsert({
    where: { digisellerProductId: raw.id_goods },
    update: {
      name: raw.name_goods, description, price: finalPrice, oldPrice, discountPercent,
      imageUrl: raw.image_link ?? null, inStock: raw.cnt_goods > 0, quantity: raw.cnt_goods,
      isActive: isAvailable, updatedAt: new Date(), lastCheckedAt: new Date(),
      hiddenAt: !isAvailable ? new Date() : null,
      hideReason: raw.status !== 1 ? "Отключён продавцом" : raw.cnt_goods <= 0 ? "Нет в наличии" : null,
    },
    create: {
      digisellerProductId: raw.id_goods, name: raw.name_goods, slug, description,
      price: finalPrice, oldPrice, discountPercent, imageUrl: raw.image_link ?? null,
      inStock: raw.cnt_goods > 0, quantity: raw.cnt_goods, isActive: isAvailable,
      importSource: "digiseller", lastCheckedAt: new Date(),
    },
  })

  await prisma.importQueue.update({
    where: { digisellerProductId: productId },
    data: { status: "done", processedAt: new Date() },
  })
  await updateImportLog("imported")
  // Background SEO generation (non-blocking, only if SEO fields empty)
  if (!product.metaTitle) {
    generateSeoForProduct({ name: raw.name_goods, description, price: finalPrice }).then(seo => {
      if (seo) prisma.product.update({ where: { id: product.id }, data: {
        metaTitle: seo.metaTitle, metaDescription: seo.metaDescription,
        metaKeywords: seo.metaKeywords, shortDesc: seo.shortDesc || undefined,
      }}).catch(() => {})
    }).catch(() => {})
  }
  return { productId: product.id, slug: product.slug }
}

// ── Import Plati.Market product ───────────────────────────────────────────────
async function processPlatiImport(job: Job) {
  const { productId, source = "manual" } = job.data as { productId: number; source?: string }
  const started = Date.now()

  const raw = await scrapePlatiProduct(productId)

  if (!raw || !raw.name) {
    await prisma.platiImportLog.updateMany({
      where: { productId, status: "queued" },
      data: { status: "not_found", error: "Товар не найден на Plati.Market", duration: Date.now() - started },
    })
    return { skipped: true, reason: "not_found" }
  }

  // Validate required fields — only name/price are hard fails; description falls back to meta
  const descPlain = raw.description?.replace(/<[^>]+>/g, '').trim() ?? ''
  const missingDetails: string[] = []
  if (!raw.name || raw.name.length < 3)
    missingDetails.push(`название (найдено: ${(raw.name ?? '').length} симв.)`)
  if (descPlain.length < 3)
    missingDetails.push(`описание (найдено: ${descPlain.length} симв.)`)
  if (raw.price <= 0)
    missingDetails.push(`цена (получено: ${raw.price})`)
  if (missingDetails.length > 0) {
    const error = `Пропущен: ${missingDetails.join(', ')}`
    console.warn(`[import-worker] #${productId} skipped — ${error}`)
    await prisma.platiImportLog.updateMany({
      where: { productId, status: "queued" },
      data: { status: "skipped", error, duration: Date.now() - started },
    })
    return { skipped: true, reason: error }
  }

  // Check if exists
  const existing = await prisma.product.findUnique({ where: { digisellerProductId: productId } })

  // Download images locally
  const localImageUrl = await downloadImage(raw.imageUrl)
  const localGallery  = raw.galleryImages.length > 0 ? await downloadImages(raw.galleryImages.slice(0, 5)) : []

  // Auto-create category from Plati.Market scraper data
  const CATEGORY_NAMES: Record<string, string> = {
    "steam":         "Steam",
    "xbox":          "Xbox",
    "playstation":   "PlayStation",
    "nintendo":      "Nintendo",
    "origin":        "EA / Origin",
    "ubisoft":       "Ubisoft",
    "subscriptions": "Подписки",
    "gift-cards":    "Подарочные карты",
    "keys":          "Ключи и активации",
  }
  let categoryId: string | undefined
  const catSlug = raw.category.toLowerCase().replace(/\s+/g, "-")
  const catName = CATEGORY_NAMES[catSlug] ?? raw.category
  try {
    const cat = await prisma.category.upsert({
      where: { slug: catSlug },
      update: {},
      create: { slug: catSlug, name: catName },
    })
    categoryId = cat.id
  } catch (err) {
    console.warn(`[import-worker] Category upsert failed for "${catSlug}":`, err)
  }

  const settings = await getImportSettings()
  const finalPrice = raw.price > 0 ? applyMarkup(raw.price, settings) : 0
  const oldPrice = raw.oldPrice ? applyMarkup(raw.oldPrice, settings) : null
  const discountPercent = oldPrice && oldPrice > finalPrice
    ? Math.round((1 - finalPrice / oldPrice) * 100) : null
  const slug = existing?.slug ?? generateSlug(raw.name, productId)

  const product = await prisma.product.upsert({
    where: { digisellerProductId: productId },
    update: {
      name: raw.name, description: raw.description, shortDesc: raw.shortDesc,
      price: finalPrice, oldPrice, discountPercent,
      imageUrl: localImageUrl, galleryImages: localGallery,
      videoUrl: raw.videoUrl ?? null,
      inStock: raw.inStock, quantity: raw.quantity,
      isActive: raw.inStock && finalPrice > 0,
      metaTitle: raw.metaTitle, metaDescription: raw.metaDescription, metaKeywords: raw.metaKeywords,
      platiUrl: raw.url, importSource: "plati",
      categoryId: categoryId ?? undefined,
      lastCheckedAt: new Date(), updatedAt: new Date(),
      hiddenAt: !raw.inStock ? new Date() : null,
      hideReason: !raw.inStock ? "Нет в наличии" : null,
    },
    create: {
      digisellerProductId: productId, name: raw.name, slug,
      description: raw.description, shortDesc: raw.shortDesc,
      price: finalPrice, oldPrice, discountPercent,
      imageUrl: localImageUrl, galleryImages: localGallery,
      videoUrl: raw.videoUrl ?? null,
      inStock: raw.inStock, quantity: raw.quantity,
      isActive: raw.inStock && finalPrice > 0,
      metaTitle: raw.metaTitle, metaDescription: raw.metaDescription, metaKeywords: raw.metaKeywords,
      platiUrl: raw.url, importSource: "plati",
      categoryId: categoryId ?? undefined,
      lastCheckedAt: new Date(),
    },
  })

  // Background SEO generation (non-blocking, only for new products without SEO)
  if (!product.metaTitle) {
    generateSeoForProduct({ name: raw.name, description: raw.description, price: finalPrice, category: catName }).then(seo => {
      if (seo) prisma.product.update({ where: { id: product.id }, data: {
        metaTitle: seo.metaTitle, metaDescription: seo.metaDescription,
        metaKeywords: seo.metaKeywords, shortDesc: seo.shortDesc || product.shortDesc || undefined,
      }}).catch(() => {})
    }).catch(() => {})
  }
  const duration = Date.now() - started
  const logStatus = existing ? "updated" : "success"

  await prisma.platiImportLog.updateMany({
    where: { productId, status: "queued", source },
    data: { productName: raw.name, status: logStatus, duration },
  })

  await updateImportLog(existing ? "updated" : "imported")
  return { productId: product.id, slug: product.slug, status: logStatus }
}

// ── Update existing Plati.Market product ────────────────────────────────────
async function processPlatiUpdate(job: Job) {
  const { productId, source = "auto-update" } = job.data as { productId: number; source?: string }
  const started = Date.now()

  const raw = await scrapePlatiProduct(productId)
  if (!raw) return { skipped: true }

  const settings = await getImportSettings()
  const finalPrice = raw.price > 0 ? applyMarkup(raw.price, settings) : 0
  const oldPrice = raw.oldPrice ? applyMarkup(raw.oldPrice, settings) : null
  const discountPercent = oldPrice && oldPrice > finalPrice
    ? Math.round((1 - finalPrice / oldPrice) * 100) : null

  const localImageUrl = await downloadImage(raw.imageUrl)
  const localGallery = raw.galleryImages.length > 0 ? await downloadImages(raw.galleryImages.slice(0, 5)) : []

  await prisma.product.updateMany({
    where: { digisellerProductId: productId },
    data: {
      price: finalPrice, oldPrice, discountPercent,
      inStock: raw.inStock, quantity: raw.quantity,
      isActive: raw.inStock && finalPrice > 0,
      description: raw.description, shortDesc: raw.shortDesc,
      imageUrl: localImageUrl,
      ...(localGallery.length > 0 ? { galleryImages: localGallery } : {}),
      lastCheckedAt: new Date(), updatedAt: new Date(),
      hiddenAt: !raw.inStock ? new Date() : null,
      hideReason: !raw.inStock ? "Нет в наличии" : null,
    },
  })

  await prisma.platiImportLog.create({
    data: {
      url: raw.url, productId,
      productName: raw.name, status: "updated",
      duration: Date.now() - started, source,
    },
  })

  await updateImportLog("updated")
  return { productId, updated: true }
}

// ── Main job processor ────────────────────────────────────────────────────────
async function processJob(job: Job) {
  switch (job.name) {
    case "sync-catalog":        return handleSyncCatalog()
    case "sync-plati-catalog":  return handleSyncPlatiCatalog()
    case "import-plati-product": return processPlatiImport(job)
    case "update-plati-product": return processPlatiUpdate(job)
    default:                    return processDigisellerImport(job)
  }
}

const worker = new Worker("product-import", processJob, {
  connection,
  concurrency: 1,
})

worker.on("failed", async (job, err) => {
  console.error(`[import-worker] Job ${job?.id} (${job?.name}) failed:`, err.message)
  if (!job) return

  if (job.name === "import-plati-product" || job.name === "update-plati-product") {
    const productId = job.data?.productId as number | undefined
    if (productId) {
      await prisma.platiImportLog.updateMany({
        where: { productId, status: { in: ["queued"] } },
        data: { status: "error", error: err.message.slice(0, 500) },
      }).catch(() => {})
    }
    await updateImportLog("errors")
  } else if (job.name === "import-product") {
    await updateImportLog("errors")
    const productId = job.data?.productId as number | undefined
    if (productId) {
      await prisma.importQueue
        .update({ where: { digisellerProductId: productId }, data: { status: "failed", lastError: err.message } })
        .catch(() => {})
    }
  }
})

// ── Auto-sync setup ──────────────────────────────────────────────────────────
async function setupAutoSync() {
  try {
    const settings = await getImportSettings()
    const repeatableJobs = await importQueue.getRepeatableJobs()

    // Digiseller sync
    const hasDigiSync = repeatableJobs.some(j => j.name === "sync-catalog")
    if (settings.syncEnabled && !hasDigiSync) {
      await importQueue.add("sync-catalog", {}, { repeat: { every: settings.syncInterval * 60 * 1000 } })
      console.log(`[worker] Digiseller sync: every ${settings.syncInterval} min`)
    } else if (!settings.syncEnabled && hasDigiSync) {
      for (const j of repeatableJobs) {
        if (j.name === "sync-catalog") await importQueue.removeRepeatableByKey(j.key)
      }
    }

    // Plati.Market auto-update every 6 hours
    const hasPlatiSync = repeatableJobs.some(j => j.name === "sync-plati-catalog")
    if (!hasPlatiSync) {
      await importQueue.add("sync-plati-catalog", {}, {
        repeat: { every: 6 * 60 * 60 * 1000 }, // 6 hours
        jobId: "plati-auto-sync",
      })
      console.log("[worker] Plati.Market auto-update: every 6h")
    }
  } catch (err) {
    console.warn("[worker] Auto-sync setup error:", err)
  }
}

setupAutoSync()

async function shutdown(signal: string) {
  console.log(`[import-worker] ${signal} — shutting down...`)
  await worker.close()
  await importQueue.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT",  () => shutdown("SIGINT"))

console.log("[import-worker] Started")
