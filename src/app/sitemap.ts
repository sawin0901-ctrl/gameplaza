import { prisma } from "@/lib/prisma"
import { MetadataRoute } from "next"

const SITE_URL = "https://gameplaza.site"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 5000,
  })

  const categories = await prisma.category.findMany({ select: { slug: true } })

  return [
    { url: SITE_URL, lastModified: new Date(), priority: 1.0 },
    { url: `${SITE_URL}/catalog`, lastModified: new Date(), priority: 0.9 },
    ...categories.map(c => ({ url: `${SITE_URL}/catalog?category=${c.slug}`, priority: 0.8 })),
    ...products.map(p => ({
      url: `${SITE_URL}/product/${p.slug}`,
      lastModified: p.updatedAt,
      priority: 0.7,
      changeFrequency: "daily" as const,
    })),
  ]
}