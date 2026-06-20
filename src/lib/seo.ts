import { Metadata } from "next"
import sanitizeHtml from "sanitize-html"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gameplaza.site"
const SITE_NAME = "GamePlaza"

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "j", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
}

function transliterate(text: string): string {
  return text.split("").map(ch => TRANSLIT[ch.toLowerCase()] ?? ch).join("")
}

function stripHtml(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
}

export function buildProductMetadata(product: {
  name: string
  description: string
  slug: string
  imageUrl?: string | null
  price: number
}): Metadata {
  const title = `${product.name} — купить | ${SITE_NAME}`
  const description = (stripHtml(product.description) || `Купить ${product.name} в GamePlaza`).slice(0, 160)
  const url = `${SITE_URL}/product/${product.slug}`
  const images = product.imageUrl ? [{ url: product.imageUrl }] : []

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.imageUrl ? [product.imageUrl] : [],
    },
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
  const base = transliterate(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60)
  return `${base}-${id}`
}

export { stripHtml }
