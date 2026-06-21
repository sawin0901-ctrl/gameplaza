import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"
import { prisma } from "../../../../lib/prisma"
import { revalidatePath } from "next/cache"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const [productCount, categoryCount] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.category.count(),
    ])

    const staticCount = 4 // home, catalog, about, help
    const sitemapPages = Math.max(1, Math.ceil(productCount / 1000))
    const totalUrls = staticCount + categoryCount + productCount

    return NextResponse.json({
      ok: true,
      stats: {
        totalUrls,
        breakdown: {
          static: staticCount,
          categories: categoryCount,
          products: productCount,
        },
        sitemapFiles: sitemapPages + 1, // +1 for static/categories sitemap
        sitemapIndex: `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://gameplaza.site"}/sitemap.xml`,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch { return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 }) }
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    revalidatePath("/sitemap.xml")
    revalidatePath("/robots.txt")
    return NextResponse.json({ ok: true, message: "Sitemap кэш сброшен", at: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}