#!/usr/bin/env node
// Запуск: node scripts/import-product.mjs 5853474
// Или несколько: node scripts/import-product.mjs 5853474 5853475 5853476

import { PrismaClient } from "@prisma/client"
import https from "https"
import http from "http"

const prisma = new PrismaClient()

function fetch(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http
    const req = lib.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ru-RU,ru;q=0.9",
      },
      timeout: 20000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetch(res.headers.location).then(resolve).catch(reject)
        return
      }
      let data = ""
      res.setEncoding("utf8")
      res.on("data", chunk => data += chunk)
      res.on("end", () => resolve({ status: res.statusCode, body: data }))
    })
    req.on("error", reject)
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")) })
  })
}

function extractBetween(html, start, end) {
  const i = html.indexOf(start)
  if (i === -1) return ""
  const j = html.indexOf(end, i + start.length)
  if (j === -1) return ""
  return html.slice(i + start.length, j).trim()
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function slugify(text, id) {
  const slug = text
    .toLowerCase()
    .replace(/[а-яё]/g, c => "абвгдеёжзийклмнопрстуфхцчшщъыьэюя".indexOf(c) !== -1
      ? "abvgdeejzijklmnoprstufhcchshshtybeyuya"["абвгдеёжзийклмнопрстуфхцчшщъыьэюя".indexOf(c)] || c : c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
  return `${slug}-${id}`
}

async function importFromPlati(productId) {
  console.log(`\n[${productId}] Получаю данные с plati.market...`)

  const { status, body } = await fetch(`https://plati.market/itm/${productId}`)
  if (status !== 200) throw new Error(`plati.market вернул статус ${status}`)

  // Имя товара
  const name =
    extractBetween(body, '<h1 class="page-title">', "</h1>") ||
    extractBetween(body, '<h1 itemprop="name">', "</h1>") ||
    extractBetween(body, "<h1>", "</h1>")
  if (!name) throw new Error("Не удалось извлечь название товара")

  // Цена
  let price = 0
  const priceMatch = body.match(/"price"\s*:\s*"?([\d.]+)"?/) ||
                     body.match(/itemprop="price"\s+content="([\d.]+)"/) ||
                     body.match(/class="[^"]*price[^"]*"[^>]*>([\d\s]+)/)
  if (priceMatch) price = parseFloat(priceMatch[1].replace(/\s/g, "")) || 0

  // Описание
  let desc = ""
  const descStart = body.indexOf('class="goods-description-main"')
  if (descStart !== -1) {
    const descBlock = body.slice(descStart, descStart + 5000)
    const inner = extractBetween(descBlock, ">", "</div>")
    desc = stripHtml(inner).slice(0, 2000)
  }
  if (!desc) {
    const metaDesc = extractBetween(body, '<meta name="description" content="', '"')
    desc = metaDesc || `Цифровой товар. ID: ${productId}`
  }

  // Изображение
  let imageUrl = null
  const imgMatch = body.match(/itemprop="image"\s+(?:src|content)="([^"]+)"/) ||
                   body.match(/<img[^>]+class="[^"]*goods-img[^"]*"[^>]+src="([^"]+)"/)
  if (imgMatch) {
    imageUrl = imgMatch[1].startsWith("http") ? imgMatch[1] : `https://plati.market${imgMatch[1]}`
  }

  // Количество продаж
  let soldCount = 0
  const soldMatch = body.match(/Продано\s+([\d]+)/) || body.match(/"sold"\s*:\s*(\d+)/)
  if (soldMatch) soldCount = parseInt(soldMatch[1]) || 0

  const cleanName = stripHtml(name)
  const slug = slugify(cleanName, productId)

  console.log(`[${productId}] Название: ${cleanName}`)
  console.log(`[${productId}] Цена: ${price} ₽`)
  console.log(`[${productId}] Slug: ${slug}`)
  console.log(`[${productId}] Изображение: ${imageUrl || "нет"}`)

  const product = await prisma.product.upsert({
    where: { digisellerProductId: productId },
    update: {
      name: cleanName,
      description: desc,
      price,
      imageUrl,
      soldCount,
      isActive: true,
      inStock: true,
      quantity: 999,
      updatedAt: new Date(),
      lastCheckedAt: new Date(),
    },
    create: {
      digisellerProductId: productId,
      name: cleanName,
      slug,
      description: desc,
      price,
      imageUrl,
      soldCount,
      isActive: true,
      inStock: true,
      quantity: 999,
      lastCheckedAt: new Date(),
    },
  })

  console.log(`[${productId}] ✅ Сохранён в базе. ID: ${product.id}, slug: ${product.slug}`)
  return product
}

async function main() {
  const ids = process.argv.slice(2).map(Number).filter(n => n > 0)
  if (ids.length === 0) {
    console.error("Укажите ID товаров: node scripts/import-product.mjs 5853474")
    process.exit(1)
  }

  console.log(`Импортирую ${ids.length} товар(ов): ${ids.join(", ")}`)

  let ok = 0, fail = 0
  for (const id of ids) {
    try {
      await importFromPlati(id)
      ok++
    } catch (err) {
      console.error(`[${id}] ❌ Ошибка: ${err.message}`)
      fail++
    }
  }

  console.log(`\nГотово: ${ok} успешно, ${fail} ошибок`)
  await prisma.$disconnect()
}

main().catch(async err => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
