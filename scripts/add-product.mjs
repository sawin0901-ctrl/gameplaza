#!/usr/bin/env node
// Прямое добавление товара в базу без скрапинга
// Запуск: node scripts/add-product.mjs

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const products = [
  {
    digisellerProductId: 5853474,
    name: "Lovable Pro Lite 300+ кредитов | 12 месяцев | Мгновенная доставка | Готовый аккаунт",
    slug: "lovable-pro-lite-300-credits-12-months-5853474",
    description: "Готовый аккаунт Lovable Pro LITE с 300+ кредитами на 12 месяцев. Мгновенная доставка после оплаты. Аккаунты создаются 05.06.2026. Получите быстрый доступ к готовому к использованию Pro аккаунту Lovable с более чем 300 кредитами. Идеально подходит для создания, тестирования и запуска проектов с Lovable AI. В комплект входит: Готовый к использованию аккаунт Lovable Pro-LITE, 300 разовых кредитов, полная гарантия.",
    price: 775,
    currency: "RUB",
    imageUrl: "https://plati.market/itm/lovable-pro-lite-300-credits-safe-12-month-instant-delivery-ready-account/5853474",
    isActive: true,
    inStock: true,
    quantity: 999,
    soldCount: 106,
  },
]

async function main() {
  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { digisellerProductId: p.digisellerProductId },
      update: {
        name: p.name,
        description: p.description,
        price: p.price,
        isActive: p.isActive,
        inStock: p.inStock,
        quantity: p.quantity,
        soldCount: p.soldCount,
        updatedAt: new Date(),
        lastCheckedAt: new Date(),
      },
      create: {
        digisellerProductId: p.digisellerProductId,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        currency: p.currency,
        isActive: p.isActive,
        inStock: p.inStock,
        quantity: p.quantity,
        soldCount: p.soldCount,
        lastCheckedAt: new Date(),
      },
    })
    console.log(`✅ Товар добавлен: ${product.name}`)
    console.log(`   ID: ${product.id}`)
    console.log(`   Slug: ${product.slug}`)
    console.log(`   Ссылка: https://gameplaza.site/product/${product.slug}`)
  }
  await prisma.$disconnect()
}

main().catch(async err => {
  console.error("❌", err.message)
  await prisma.$disconnect()
  process.exit(1)
})
