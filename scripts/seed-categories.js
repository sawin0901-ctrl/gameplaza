const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()

const CATEGORIES = [
  { name: "Игры Steam",         slug: "steam",         color: "#1b2838" },
  { name: "Xbox",               slug: "xbox",          color: "#107c10" },
  { name: "PlayStation",        slug: "playstation",   color: "#003087" },
  { name: "Nintendo",           slug: "nintendo",      color: "#e4000f" },
  { name: "Game Pass",          slug: "game-pass",     color: "#107c10" },
  { name: "Ключи активации",    slug: "keys",          color: "#7c3aed" },
  { name: "Подарочные карты",   slug: "gift-cards",    color: "#d97706" },
  { name: "Подписки",           slug: "subscriptions", color: "#0891b2" },
  { name: "Windows",            slug: "windows",       color: "#0078d4" },
  { name: "Программы",          slug: "software",      color: "#6366f1" },
  { name: "Антивирусы",         slug: "antivirus",     color: "#dc2626" },
  { name: "Office",             slug: "office",        color: "#d83b01" },
  { name: "VPN и безопасность", slug: "vpn",           color: "#059669" },
  { name: "Origin / EA",        slug: "origin",        color: "#f97316" },
  { name: "Ubisoft",            slug: "ubisoft",       color: "#1d4ed8" },
]

async function main() {
  let created = 0, skipped = 0
  for (const cat of CATEGORIES) {
    const existing = await p.category.findUnique({ where: { slug: cat.slug } })
    if (existing) {
      skipped++
      console.log("skip (exists):", cat.slug)
    } else {
      await p.category.create({ data: { name: cat.name, slug: cat.slug, color: cat.color } })
      created++
      console.log("created:", cat.slug)
    }
  }
  console.log("\nDone:", created, "created,", skipped, "skipped")
}

main().catch(console.error).finally(() => p.$disconnect())