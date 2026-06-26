import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { revalidatePath } from "next/cache"
import { PRODUCTS_PER_SITEMAP } from "../../../sitemap"

export const dynamic = "force-dynamic"

const STATIC_COUNT = 9 // home, catalog, discount, about, help, reviews, privacy, terms, refund
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gameplaza.site"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [productCount, categoryCount] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.category.count(),
    ])

    const productFiles = Math.max(1, Math.ceil(productCount / PRODUCTS_PER_SITEMAP))
    const totalUrls = STATIC_COUNT + categoryCount + productCount

    // File 0: static + categories
    const file0Count = STATIC_COUNT + categoryCount

    // Files 1..N: products
    const productSitemapFiles = Array.from({ length: productFiles }, (_, i) => {
      const from = i * PRODUCTS_PER_SITEMAP + 1
      const to = Math.min((i + 1) * PRODUCTS_PER_SITEMAP, productCount)
      const count = to - from + 1
      return {
        id: i + 1,
        label: `Товары — часть ${i + 1}`,
        url: `${BASE}/sitemap/${i + 1}.xml`,
        urlCount: Math.max(0, count),
        range: { from, to },
      }
    })

    const files = [
      {
        id: "index",
        label: "Sitemap Index (главный)",
        url: `${BASE}/sitemap.xml`,
        urlCount: 1 + productFiles, // index entries
        range: null,
        isIndex: true,
      },
      {
        id: 0,
        label: "Статические страницы и категории",
        url: `${BASE}/sitemap/0.xml`,
        urlCount: file0Count,
        range: null,
        isIndex: false,
      },
      ...productSitemapFiles.map(f => ({ ...f, isIndex: false, id: f.id as number | string })),
    ]

    return NextResponse.json({
      ok: true,
      stats: {
        totalUrls,
        breakdown: {
          static: STATIC_COUNT,
          categories: categoryCount,
          products: productCount,
        },
        sitemapFiles: 1 + productFiles, // +1 for static/categories
        revalidateSeconds: 3600,
        sitemapIndex: `${BASE}/sitemap.xml`,
      },
      files,
      generatedAt: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json({ error: "Ошибка сервера", detail: String(e) }, { status: 500 })
  }
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Revalidate all sitemap paths
    revalidatePath("/sitemap.xml")
    revalidatePath("/sitemap/[id]", "page")
    revalidatePath("/robots.txt")

    const productCount = await prisma.product.count({ where: { isActive: true } }).catch(() => 0)
    const productFiles = Math.max(1, Math.ceil(productCount / PRODUCTS_PER_SITEMAP))

    // Trigger each sitemap file revalidation
    for (let i = 0; i <= productFiles; i++) {
      revalidatePath(`/sitemap/${i}.xml`)
    }

    return NextResponse.json({
      ok: true,
      message: `Sitemap сброшен (${productFiles + 1} файлов)`,
      at: new Date().toISOString(),
      filesRevalidated: productFiles + 2,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
