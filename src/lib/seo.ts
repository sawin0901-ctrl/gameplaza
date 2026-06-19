import { Metadata } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gameplaza.site"
const SITE_NAME = "GamePlaza"

export function buildProductMetadata(product: {
  name: string
  description: string
  slug: string
  imageUrl?: string | null
  price: number
}): Metadata {
  const title = `${product.name} — купить | ${SITE_NAME}`
  const description = product.description.replace(/<[^>]+>/g, "").slice(0, 160)
  const url = `${SITE_URL}/product/${product.slug}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      images: product.imageUrl ? [{ url: product.imageUrl }] : [],
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: url },
  }
}

export function buildCatalogMetadata(category?: string): Metadata {
  const title = category
    ? `${category} — каталог | ${SITE_NAME}`
    : `Каталог цифровых товаров | ${SITE_NAME}`
  return {
    title,
    description: `Купить цифровые товары онлайн. Игры, ПО, ключи активации — ${SITE_NAME}`,
    openGraph: { title, siteName: SITE_NAME, type: "website" },
  }
}

export function generateSlug(name: string, id: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
  return `${base}-${id}`
}