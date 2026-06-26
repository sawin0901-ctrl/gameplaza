import { MetadataRoute } from "next"
import { prisma } from "../lib/prisma"

export const revalidate = 3600

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gameplaza.site"
export const PRODUCTS_PER_SITEMAP = 1000

// id=0  → static pages + categories
// id=1+ → products batch (id-1)*PRODUCTS_PER_SITEMAP
export async function generateSitemaps() {
  const productCount = await prisma.product.count({ where: { isActive: true } }).catch(() => 0)
  const productFiles = Math.max(1, Math.ceil(productCount / PRODUCTS_PER_SITEMAP))
  return [
    { id: 0 },
    ...Array.from({ length: productFiles }, (_, i) => ({ id: i + 1 })),
  ]
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  if (id === 0) {
    const staticPages: MetadataRoute.Sitemap = [
      { url: BASE,                          lastModified: now, changeFrequency: "daily",   priority: 1.0 },
      { url: BASE + "/catalog",             lastModified: now, changeFrequency: "hourly",  priority: 0.9 },
      { url: BASE + "/catalog/discount",    lastModified: now, changeFrequency: "daily",   priority: 0.85 },
      { url: BASE + "/about",               lastModified: now, changeFrequency: "monthly", priority: 0.5 },
      { url: BASE + "/help",                lastModified: now, changeFrequency: "monthly", priority: 0.6 },
      { url: BASE + "/reviews",             lastModified: now, changeFrequency: "weekly",  priority: 0.5 },
      { url: BASE + "/privacy",             lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
      { url: BASE + "/terms",               lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
      { url: BASE + "/refund",              lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    ]

    const categories = await prisma.category.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { createdAt: "asc" },
    }).catch(() => [])

    const categoryPages: MetadataRoute.Sitemap = categories.map(c => ({
      url: BASE + "/catalog/" + c.slug,
      lastModified: c.updatedAt,
      changeFrequency: "daily",
      priority: 0.8,
    }))

    return [...staticPages, ...categoryPages]
  }

  const page = id - 1
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true, soldCount: true },
    orderBy: [{ soldCount: "desc" }, { importedAt: "desc" }],
    take: PRODUCTS_PER_SITEMAP,
    skip: page * PRODUCTS_PER_SITEMAP,
  }).catch(() => [])

  return products.map(p => ({
    url: BASE + "/product/" + encodeURIComponent(p.slug),
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: (p.soldCount ?? 0) > 50 ? 0.85 : (p.soldCount ?? 0) > 10 ? 0.75 : 0.65,
  }))
}
