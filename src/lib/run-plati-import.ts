import { scrapePlatiProduct } from "./plati-scraper"
import { downloadImage, downloadImages } from "./image-downloader"
import { getImportSettings, applyMarkup } from "./import-settings"
import { generateSlug } from "./seo"
import { generateSeoForProduct } from "./seo-generator"
import { prisma } from "./prisma"
import sharp from "sharp"
import fs from "fs"
import path from "path"

export type PlatiImportResult = {
  status: "success" | "skipped" | "error" | "duplicate"
  productId?: string
  productName?: string
  reason?: string
  duration: number
}

const CATEGORY_MAP: Record<string, string> = {
  steam: "Steam",
  xbox: "Xbox",
  playstation: "PlayStation",
  "game-pass": "Xbox Game Pass",
  software: "Программы",
  antivirus: "Антивирусы",
  windows: "Windows",
  subscriptions: "Подписки",
  "gift-cards": "Подарочные карты",
  nintendo: "Nintendo",
  origin: "EA / Origin",
  ubisoft: "Ubisoft Connect",
  keys: "Ключи и активации",
}

// Only import products from these gaming categories
const ALLOWED_CATEGORIES = new Set([
  "steam", "xbox", "playstation", "game-pass", "nintendo",
  "origin", "ubisoft", "keys", "gift-cards", "subscriptions",
  "antivirus", "windows", "software",
])

const JUNK_RE = [
  /plati\.?market/i,
  /маркетплейс цифровых/i,
  /цифровых товаров/i,
  /продавайте на нашем/i,
  /интернет.витрин/i,
  /интернет.магазин/i,
  /веб.сайт/i,
  /сетевая игра тысяч/i,
  /\bexplorer\b/i,
  /\bqstring/i,
  /мобильное приложение/i,
  /создание сайт/i,
  /landing page/i,
  /лендинг/i,
  /онлайн.курс/i,
  /обучающий курс/i,
  /курс по /i,
  /заработ/i,
  /инвестиц/i,
  /криптовалют/i,
  /ставки на спорт/i,
  /казино/i,
]

const MIN_PRICE_RUB = 30
const MIN_IMAGE_BYTES = 15_000

export async function runPlatiImport(platiId: number): Promise<PlatiImportResult> {
  const t0 = Date.now()
  const dur = () => Date.now() - t0

  try {
    const existing = await prisma.product.findUnique({
      where: { digisellerProductId: platiId },
      select: { id: true, name: true },
    })
    if (existing) {
      return { status: "duplicate", productId: existing.id, productName: existing.name, duration: dur() }
    }

    const raw = await scrapePlatiProduct(platiId).catch(() => null)
    if (!raw || !raw.name) {
      return { status: "skipped", reason: "Товар не найден на Plati.Market", duration: dur() }
    }

    const desc = raw.description?.replace(/<[^>]+>/g, "").trim() ?? ""
    if (!raw.name || raw.name.length < 3) return { status: "skipped", reason: "Слишком короткое название", duration: dur() }
    if (desc.length < 3) return { status: "skipped", reason: "Нет описания", duration: dur() }
    if (raw.price <= 0) return { status: "skipped", reason: "Нет цены", duration: dur() }
    if (raw.price < MIN_PRICE_RUB) return { status: "skipped", reason: `Цена слишком низкая (${raw.price} ₽)`, duration: dur() }
    if (!raw.imageUrl) return { status: "skipped", reason: "Нет изображения", duration: dur() }

    for (const re of JUNK_RE) {
      if (re.test(raw.name)) return { status: "skipped", reason: "Мусорный товар (название)", duration: dur() }
    }

    // Category check — only accept known gaming categories
    const catSlug = raw.category?.toLowerCase().replace(/\s+/g, "-") ?? "keys"
    if (!ALLOWED_CATEGORIES.has(catSlug)) {
      return { status: "skipped", reason: `Неизвестная категория: ${catSlug}`, duration: dur() }
    }

    const localImg = await downloadImage(raw.imageUrl).catch(() => null)
    if (!localImg) return { status: "skipped", reason: "Не удалось скачать изображение", duration: dur() }

    // Reject placeholder/tiny images by file size
    try {
      const absPath = path.join(process.cwd(), "public", localImg)
      const stat = fs.statSync(absPath)
      if (stat.size < MIN_IMAGE_BYTES) {
        fs.unlinkSync(absPath)
        return { status: "skipped", reason: `Изображение слишком мало (${stat.size} байт — заглушка)`, duration: dur() }
      }
    } catch { /* ignore */ }

    try {
      const meta = await sharp(path.join(process.cwd(), "public", localImg)).metadata()
      if ((meta.width ?? 0) < 300 || (meta.height ?? 0) < 300) {
        return { status: "skipped", reason: `Низкое качество изображения (${meta.width}x${meta.height})`, duration: dur() }
      }
    } catch { /* ignore */ }

    const gallery = (raw.galleryImages?.length ?? 0) > 0
      ? await downloadImages(raw.galleryImages.slice(0, 5)).catch(() => [])
      : []

    const catName = CATEGORY_MAP[catSlug] ?? raw.category ?? "Ключи и активации"
    let categoryId: string | undefined
    try {
      const cat = await prisma.category.upsert({
        where: { slug: catSlug },
        update: {},
        create: { slug: catSlug, name: catName },
      })
      categoryId = cat.id
    } catch { /* optional */ }

    const settings = await getImportSettings()
    const price = applyMarkup(raw.price, settings)
    const oldPrice = raw.oldPrice ? applyMarkup(raw.oldPrice, settings) : null
    const discount = oldPrice && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : null
    const slug = generateSlug(raw.name, platiId)

    const product = await prisma.product.upsert({
      where: { digisellerProductId: platiId },
      update: {
        name: raw.name,
        description: raw.description,
        shortDesc: raw.shortDesc,
        price,
        oldPrice,
        discountPercent: discount,
        imageUrl: localImg,
        galleryImages: gallery,
        videoUrl: raw.videoUrl ?? null,
        inStock: raw.inStock,
        quantity: raw.quantity,
        isActive: raw.inStock && price > 50,
        platiUrl: raw.url,
        importSource: "plati",
        categoryId: categoryId ?? undefined,
        lastCheckedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        digisellerProductId: platiId,
        name: raw.name,
        slug,
        description: raw.description,
        shortDesc: raw.shortDesc,
        price,
        oldPrice,
        discountPercent: discount,
        imageUrl: localImg,
        galleryImages: gallery,
        videoUrl: raw.videoUrl ?? null,
        inStock: raw.inStock,
        quantity: raw.quantity,
        isActive: raw.inStock && price > 50,
        platiUrl: raw.url,
        importSource: "plati",
        categoryId: categoryId ?? undefined,
        lastCheckedAt: new Date(),
      },
    })

    if (!product.metaTitle) {
      generateSeoForProduct({ name: raw.name, description: raw.description, price, category: catName })
        .then(seo => {
          if (!seo) return
          return prisma.product.update({
            where: { id: product.id },
            data: {
              metaTitle: seo.metaTitle,
              metaDescription: seo.metaDescription,
              metaKeywords: seo.metaKeywords,
              shortDesc: seo.shortDesc || product.shortDesc || undefined,
            },
          })
        })
        .catch(() => {})
    }

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const log = await prisma.importLog.findFirst({ where: { date: { gte: today } } })
      if (log) {
        await prisma.importLog.update({ where: { id: log.id }, data: { imported: { increment: 1 } } })
      } else {
        await prisma.importLog.create({ data: { imported: 1 } })
      }
    } catch { /* non-critical */ }

    return { status: "success", productId: product.id, productName: product.name, duration: dur() }
  } catch (err) {
    return {
      status: "error",
      reason: err instanceof Error ? err.message.slice(0, 500) : String(err),
      duration: dur(),
    }
  }
}