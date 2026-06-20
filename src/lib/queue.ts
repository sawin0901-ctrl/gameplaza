import { Queue } from "bullmq"

function getRedisConnection() {
  const url = new URL(process.env.REDIS_URL ?? "redis://localhost:6379")
  return {
    host: url.hostname,
    port: parseInt(url.port || "6379"),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
  }
}

export const connection = getRedisConnection()

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
    { priority, jobId: `product-${productId}` }
  )
}

export async function scheduleBatchImport(productIds: number[]) {
  const jobs = productIds.map((id, i) => ({
    name: "import-product",
    data: { productId: id },
    opts: {
      jobId: `product-${id}`,
      delay: i * 5 * 60 * 1000,
    },
  }))
  await importQueue.addBulk(jobs)
}
