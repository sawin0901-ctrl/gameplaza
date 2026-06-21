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
  const title = `${product.name} — купить дешево | ${SITE_NAME}`
  const description = (
    stripHtml(product.description) ||
    `Купить ${product.name}. Моментальная доставка, безопасная оплата и поддержка покупателей.`
  ).slice(0, 160)
  const url = `${SITE_URL}/product/${product.slug}`
  const ogImage = SITE_URL + "/api/og?title=" + encodeURIComponent(product.name) + "&price=" + product.price + (product.imageUrl ? "&img=" + encodeURIComponent(product.imageUrl) : "")
  const images = [{ url: ogImage, width: 1200, height: 630 }, ...(product.imageUrl ? [{ url: product.imageUrl }] : [])]

  return {
    title: { absolute: title },
    description,
    keywords: `${product.name}, купить, ключ активации, аккаунт, подписка, игра`,
    openGraph: {
      title: { absolute: title },
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: { absolute: title },
      description,
      images: product.imageUrl ? [product.imageUrl] : [],
    },
    alternates: { canonical: url },
  }
}

export function buildCatalogMetadata(opts: {
  categoryName?: string | null
  categorySlug?: string
  query?: string
  sort?: string
  page?: number
}): Metadata {
  const { categoryName, categorySlug, query, sort, page = 1 } = opts
  const isDiscount = sort === "discount"
  const isSearch = !!query

  let title: string
  let description: string
  let canonical: string

  if (isDiscount) {
    title = `Акции и скидки на цифровые товары | ${SITE_NAME}`
    description = `Товары со скидкой: игры, ключи активации, подписки. Лучшие цены в ${SITE_NAME}.`
    canonical = `${SITE_URL}/catalog/discount`
  } else if (isSearch) {
    title = `Поиск: ${query} | ${SITE_NAME}`
    description = `Результаты поиска «${query}». Цифровые товары: игры, ключи, подписки по выгодным ценам.`
    canonical = `${SITE_URL}/catalog?q=${encodeURIComponent(query)}`
  } else if (categoryName && categorySlug) {
    title = `${categoryName} | ${SITE_NAME}`
    description = `Купить товары из категории ${categoryName} по выгодным ценам. Моментальная доставка через Digiseller.`
    canonical = `${SITE_URL}/catalog/${categorySlug}`
  } else {
    title = `Каталог цифровых товаров | ${SITE_NAME}`
    description = `Купить игры Steam, Xbox, PlayStation, программы, ключи активации и подписки. Тысячи товаров с мгновенной доставкой.`
    canonical = `${SITE_URL}/catalog`
  }

  if (page > 1) canonical += `${canonical.includes("?") ? "&" : "?"}page=${page}`

  return {
    title: { absolute: title },
    description,
    robots: { index: !isSearch, follow: true },
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  }
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
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