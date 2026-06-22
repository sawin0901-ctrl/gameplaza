const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()

const CATEGORIES = [
  { name: "Игры Steam",        slug: "steam",        icon: "🎮", sortOrder: 1 },
  { name: "Xbox",              slug: "xbox",          icon: "🎮", sortOrder: 2 },
  { name: "PlayStation",       slug: "playstation",   icon: "🎮", sortOrder: 3 },
  { name: "Nintendo",          slug: "nintendo",      icon: "🎮", sortOrder: 4 },
  { name: "Game Pass",         slug: "game-pass",     icon: "🎮", sortOrder: 5 },
  { name: "Ключи активации",   slug: "keys",          icon: "🔑", sortOrder: 6 },
  { name: "Подарочные карты",  slug: "gift-cards",    icon: "🎁", sortOrder: 7 },
  { name: "Подписки",          slug: "subscriptions", icon: "📦", sortOrder: 8 },
  { name: "Windows",           slug: "windows",       icon: "🖥️", sortOrder: 9 },
  { name: "Программы",         slug: "software",      icon: "💻", sortOrder: 10 },
  { name: "Антивирусы",        slug: "antivirus",     icon: "🛡️", sortOrder: 11 },
  { name: "Office",            slug: "office",        icon: "📊", sortOrder: 12 },
  { name: "VPN & Безопасность",slug: "vpn",           icon: "🔒", sortOrder: 13 },
  { name: "Origin / EA",       slug: "origin",        icon: "🎮", sortOrder: 14 },
  { name: "Ubisoft",           slug: "ubisoft",       icon: "🎮", sortOrder: 15 },
]

async function main() {
  let created = 0, updated = 0
  for (const cat of CATEGORIES) {
    const data = { name: cat.name, icon: cat.icon, sortOrder: cat.sortOrder }
    const existing = await p.category.findUnique({ where: { slug: cat.slug } })
    if (existing) {
      await p.category.update({ where: { slug: cat.slug }, data })
      updated++
      console.log("updated:", cat.slug)
    } else {
      await p.category.create({ data: { ...data, slug: cat.slug } })
      created++
      console.log("created:", cat.slug)
    }
  }
  console.log(`\nDone: ${created} created, ${updated} updated`)
}

main().catch(console.error).finally(() => p.$disconnect())