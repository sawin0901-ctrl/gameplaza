import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../lib/auth"
import { prisma } from "../../../../../lib/prisma"
import { generateSeoForProduct, checkSeoProviders } from "../../../../../lib/seo-generator"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { batchSize = 10, force = false } = await req.json().catch(() => ({}))
  const safe = Math.min(Math.max(1, Number(batchSize)), 50)

  const providers = await checkSeoProviders()
  const hasProvider = Object.values(providers).some(Boolean)
  if (!hasProvider) {
    return NextResponse.json({
      processed: 0, updated: 0, errors: 0,
      errorMsg: "Нет API-ключей: установите GEMINI_API_KEY, ANTHROPIC_API_KEY или DEEPSEEK_API_KEY в .env",
      providers,
    })
  }

  const products = await prisma.product.findMany({
    where: force ? {} : { metaTitle: null },
    select: { id: true, name: true, description: true, price: true, category: { select: { name: true } } },
    take: safe,
    orderBy: { createdAt: "desc" },
  })

  let updated = 0; let errors = 0
  const failedNames: string[] = []

  for (const p of products) {
    try {
      const seo = await generateSeoForProduct({
        name: p.name,
        description: p.description,
        price: Number(p.price),
        category: p.category?.name ?? null,
      })
      if (seo) {
        await prisma.product.update({
          where: { id: p.id },
          data: {
            metaTitle: seo.metaTitle,
            metaDescription: seo.metaDescription,
            metaKeywords: seo.metaKeywords,
            shortDesc: seo.shortDesc || undefined,
          },
        })
        updated++
      } else {
        errors++
        failedNames.push(p.name.slice(0, 30))
      }
    } catch (e) {
      errors++
      failedNames.push(p.name.slice(0, 30))
      console.error("[SEO generate]", p.id, e)
    }
    await new Promise(r => setTimeout(r, 500))
  }

  return NextResponse.json({
    processed: products.length,
    updated,
    errors,
    providers,
    failedNames: failedNames.slice(0, 5),
  })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const [total, withSeo, withoutSeo] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { metaTitle: { not: null } } }),
    prisma.product.count({ where: { metaTitle: null } }),
  ])
  const providers = await checkSeoProviders()
  return NextResponse.json({ total, withSeo, withoutSeo, providers })
}