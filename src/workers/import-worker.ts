import { Worker, Job } from "bullmq"
import { connection } from "../lib/queue"
import { prisma } from "../lib/prisma"
import { getDigisellerProduct } from "../lib/digiseller"
import { checkProductQuality } from "../lib/quality-check"
import { processDescription } from "../lib/link-processor"
import { generateSlug } from "../lib/seo"

async function processImport(job: Job) {
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

  const product = await prisma.product.upsert({
    where: { digisellerProductId: raw.id_goods },
    update: {
      name: raw.name_goods,
      description,
      price: raw.price_rub,
      imageUrl: raw.image_link ?? null,
      inStock: raw.cnt_goods > 0,
      quantity: raw.cnt_goods,
      isActive: raw.status === 1 && raw.cnt_goods > 0,
      updatedAt: new Date(),
      lastCheckedAt: new Date(),
      hiddenAt: (raw.status !== 1 || raw.cnt_goods <= 0) ? new Date() : null,
      hideReason: raw.status !== 1 ? "Отключён продавцом" : raw.cnt_goods <= 0 ? "Нет в наличии" : null,
    },
    create: {
      digisellerProductId: raw.id_goods,
      name: raw.name_goods,
      slug,
      description,
      price: raw.price_rub,
      imageUrl: raw.image_link ?? null,
      inStock: raw.cnt_goods > 0,
      quantity: raw.cnt_goods,
      isActive: raw.status === 1 && raw.cnt_goods > 0,
      lastCheckedAt: new Date(),
    },
  })

  await prisma.importQueue.update({
    where: { digisellerProductId: productId },
    data: { status: "done", processedAt: new Date() },
  })

  return { productId: product.id, slug: product.slug }
}

const worker = new Worker("product-import", processImport, { connection })

worker.on("failed", (job, err) => {
  console.error(`[import] Job ${job?.id} failed:`, err.message)
})

console.log("[import-worker] Started")