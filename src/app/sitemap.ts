import { MetadataRoute } from "next"
import { prisma } from "../lib/prisma"

export const revalidate = 3600

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gameplaza.site"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: BASE + "/catalog", lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: BASE + "/catalog/discount", lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: BASE + "/about", lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: BASE + "/help", lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ]

  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      select: { slug: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }).catch(() => []),
    prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true, soldCount: true },
      orderBy: [{ soldCount: "desc" }, { importedAt: "desc" }],
      take: 49000,
    }).catch(() => []),
  ])

  const categoryPages: MetadataRoute.Sitemap = categories.map(c => ({
    url: BASE + "/catalog/" + c.slug,
    lastModified: c.createdAt,
    changeFrequency: "daily",
    priority: 0.8,
  }))

  const productPages: MetadataRoute.Sitemap = products.map(p => ({
    url: BASE + "/product/" + encodeURIComponent(p.slug),
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: p.soldCount && p.soldCount > 50 ? 0.85 : p.soldCount && p.soldCount > 10 ? 0.75 : 0.65,
  }))

  return [...staticPages, ...categoryPages, ...productPages]
}