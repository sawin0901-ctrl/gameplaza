import { MetadataRoute } from "next"
import { prisma } from "../lib/prisma"

export const revalidate = 3600 // ISR: regenerate every hour

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://gameplaza.site"
const PRODUCTS_PER_SITEMAP = 1000

// ── Static pages ──────────────────────────────────────────────────────────────
const STATIC: MetadataRoute.Sitemap = [
  { url: BASE,                  lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
  { url: `${BASE}/catalog`,     lastModified: new Date(), changeFrequency: "hourly",  priority: 0.9 },
  { url: `${BASE}/about`,       lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  { url: `${BASE}/help`,        lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
]

// ── Split sitemaps generator ──────────────────────────────────────────────────
// sitemap id=0  → static + categories
// sitemap id=1+ → products (1000 per sitemap)
export async function generateSitemaps() {
  const productCount = await prisma.product.count({ where: { isActive: true } })
  const productPages = Math.max(1, Math.ceil(productCount / PRODUCTS_PER_SITEMAP))
  return [{ id: 0 }, ...Array.from({ length: productPages }, (_, i) => ({ id: i + 1 }))]
}

export default async function sitemap(
  { id }: { id: number },
): Promise<MetadataRoute.Sitemap> {
  // ── Sitemap 0: static pages + categories ──────────────────────────────────
  if (id === 0) {
    const categories = await prisma.category.findMany({
      select: { slug: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    })

    const categoryEntries: MetadataRoute.Sitemap = categories.map(c => ({
      url: `${BASE}/catalog?category=${encodeURIComponent(c.slug)}`,
      lastModified: c.createdAt,
      changeFrequency: "daily",
      priority: 0.8,
    }))

    return [...STATIC, ...categoryEntries]
  }

  // ── Sitemap 1+: products (paginated) ─────────────────────────────────────
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true, soldCount: true, rating: true },
    orderBy: { importedAt: "desc" },
    skip: (id - 1) * PRODUCTS_PER_SITEMAP,
    take: PRODUCTS_PER_SITEMAP,
  })

  return products.map(p => ({
    url: `${BASE}/product/${encodeURIComponent(p.slug)}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    // Popular products get slightly higher priority
    priority: p.soldCount && p.soldCount > 50 ? 0.85 : p.soldCount && p.soldCount > 10 ? 0.75 : 0.65,
  }))
}
