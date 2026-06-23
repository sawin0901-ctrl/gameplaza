import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"

export const dynamic = "force-dynamic"

const SEO_BY_SLUG: Record<string, { metaTitle: string; metaDesc: string }> = {
  steam: {
    metaTitle: "Ключи Steam — купить игры дёшево | GamePlaza",
    metaDesc: "Купить Steam ключи и игры по выгодным ценам. Лицензионные ключи для активации в Steam. Огромный каталог, мгновенная доставка на email, гарантия.",
  },
  ubisoft: {
    metaTitle: "Ubisoft Connect ключи — купить | GamePlaza",
    metaDesc: "Купить ключи Ubisoft Connect: Far Cry, Assassin's Creed, The Crew, Rainbow Six и другие. Лицензионные ключи по лучшей цене, мгновенная доставка.",
  },
  keys: {
    metaTitle: "Ключи активации игр — купить дёшево | GamePlaza",
    metaDesc: "Каталог лицензионных ключей активации для Steam, Ubisoft, EA, Nintendo и других платформ. Выгодные цены на цифровые игры, мгновенная доставка.",
  },
  subscriptions: {
    metaTitle: "Подписки Xbox Game Pass и PS Plus | GamePlaza",
    metaDesc: "Купить подписки Xbox Game Pass Ultimate, PS Plus, EA Play, Nintendo Switch Online по лучшей цене. Мгновенная доставка кода, гарантия активации.",
  },
  nintendo: {
    metaTitle: "Nintendo eShop карты и ключи Switch | GamePlaza",
    metaDesc: "Купить Nintendo eShop карты пополнения и ключи для Switch. Mario, Zelda, Pokemon и другие игры Nintendo по выгодным ценам с доставкой на email.",
  },
  xbox: {
    metaTitle: "Xbox ключи и Gift Card — купить дёшево | GamePlaza",
    metaDesc: "Ключи для Xbox Series X/S и Xbox One, Gift Card, Game Pass Ultimate. Лицензионные ключи Xbox с мгновенной доставкой и гарантией активации.",
  },
  "gift-cards": {
    metaTitle: "Подарочные карты Steam, PSN, Xbox | GamePlaza",
    metaDesc: "Пополнение Steam кошелька, PSN, Xbox, Google Play и iTunes. Подарочные карты по лучшей цене с мгновенной доставкой. Отличный подарок геймеру.",
  },
  playstation: {
    metaTitle: "PlayStation ключи и PS Plus — купить | GamePlaza",
    metaDesc: "Купить игры PS4 и PS5, подписку PS Plus Extra и Premium. Пополнение PSN кошелька. Лицензионные ключи PlayStation с гарантией и быстрой доставкой.",
  },
  origin: {
    metaTitle: "EA App и Origin ключи — купить | GamePlaza",
    metaDesc: "Купить игры EA и ключи Origin: FIFA, The Sims, Battlefield, Mass Effect. Подписка EA Play по лучшим ценам, мгновенная доставка на email.",
  },
  "game-pass": {
    metaTitle: "Xbox Game Pass Ultimate — купить | GamePlaza",
    metaDesc: "Купить Xbox Game Pass Ultimate и PC Game Pass. Доступ к 100+ играм и EA Play в подписке. Лучшая цена, мгновенная доставка, гарантия активации.",
  },
  windows: {
    metaTitle: "Windows 10 и 11 ключи активации | GamePlaza",
    metaDesc: "Лицензионные ключи Windows 10 Home/Pro и Windows 11 по выгодной цене. OEM и Retail ключи с мгновенной доставкой на email. Гарантия активации.",
  },
  software: {
    metaTitle: "Программы и ПО — ключи активации | GamePlaza",
    metaDesc: "Лицензионные ключи для программного обеспечения: Microsoft Office, Adobe, архиваторы и утилиты. Выгодные цены, официальные ключи, быстрая доставка.",
  },
  antivirus: {
    metaTitle: "Антивирусы — ключи активации | GamePlaza",
    metaDesc: "Купить лицензионные ключи антивирусов: Kaspersky, Dr.Web, ESET, Norton, Avast. Надёжная защита ПК по лучшим ценам с мгновенной доставкой.",
  },
  office: {
    metaTitle: "Microsoft Office ключи — купить | GamePlaza",
    metaDesc: "Купить ключ активации Microsoft Office 2021, Office 2019 и Microsoft 365. Лицензионные ключи для дома и работы. Мгновенная доставка, гарантия.",
  },
  vpn: {
    metaTitle: "VPN и безопасность — купить ключи | GamePlaza",
    metaDesc: "Купить подписку VPN: NordVPN, ExpressVPN, Surfshark и другие. Менеджеры паролей и решения кибербезопасности. Анонимность и защита в интернете.",
  },
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const categories = await prisma.category.findMany({ select: { id: true, slug: true, metaTitle: true } })
  let updated = 0; let skipped = 0

  for (const cat of categories) {
    const defaults = SEO_BY_SLUG[cat.slug]
    if (!defaults) { skipped++; continue }
    await prisma.category.update({
      where: { id: cat.id },
      data: { metaTitle: defaults.metaTitle, metaDesc: defaults.metaDesc },
    })
    updated++
  }

  return NextResponse.json({ ok: true, updated, skipped, total: categories.length })
}