import { Queue, Worker, Job } from "bullmq"
import IORedis from "ioredis"

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
})

export const importQueue = new Queue("product-import", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 60_000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
})

export const linkQueue = new Queue("link-update", {
  connection,
  defaultJobOptions: { attempts: 2, backoff: { type: "fixed", delay: 30_000 } },
})

export async function scheduleImport(productId: number, priority = 0) {
  await importQueue.add(
    "import-product",
    { productId },
    { priority, jobId: `product-${productId}`, delay: 0 }
  )
}

export async function scheduleBatchImport(productIds: number[]) {
  const jobs = productIds.map((id, i) => ({
    name: "import-product",
    data: { productId: id },
    opts: {
      jobId: `product-${id}`,
      delay: i * 5 * 60 * 1000, // 1 товар каждые 5 минут
    },
  }))
  await importQueue.addBulk(jobs)
}

export { connection }