import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { generateSeoForProduct } from "../../../../lib/seo-generator"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { batchSize = 10, force = false } = await req.json().catch(() => ({}))
  const safe = Math.min(Math.max(1, Number(batchSize)), 50)

  const products = await prisma.product.findMany({
    where: force ? {} : { metaTitle: null },
    select: { id: true, name: true, description: true, price: true, category: { select: { name: true } } },
    take: safe,
  })

  let updated = 0; let errors = 0
  for (const p of products) {
    const seo = await generateSeoForProduct({
      name: p.name, description: p.description, price: p.price,
      category: p.category?.name ?? null,
    })
    if (seo) {
      await prisma.product.update({
        where: { id: p.id },
        data: { metaTitle: seo.metaTitle, metaDescription: seo.metaDescription,
                metaKeywords: seo.metaKeywords, shortDesc: seo.shortDesc || undefined },
      }).then(() => updated++).catch(() => errors++)
    } else { errors++ }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 300))
  }

  return NextResponse.json({ processed: products.length, updated, errors })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const [total, withSeo, withoutSeo] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { metaTitle: { not: null } } }),
    prisma.product.count({ where: { metaTitle: null } }),
  ])
  return NextResponse.json({ total, withSeo, withoutSeo })
}