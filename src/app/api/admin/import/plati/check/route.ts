import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../../lib/auth"
import { prisma } from "../../../../../../lib/prisma"
import * as fs from "fs"
import * as path from "path"

function checkLocalImage(imageUrl: string | null): boolean {
  if (!imageUrl) return false
  if (!imageUrl.startsWith("/uploads/")) return true // External URL — assume ok
  const filePath = path.join(process.cwd(), "public", imageUrl)
  return fs.existsSync(filePath)
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const productId = parseInt(searchParams.get("productId") ?? "")
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 })

  const product = await prisma.product.findUnique({
    where: { digisellerProductId: productId },
    include: { category: { select: { name: true, slug: true } } },
  })

  if (!product) {
    return NextResponse.json({
      found: false,
      productId,
      checks: [{ name: "Карточка создана", ok: false, error: "Товар не найден в базе данных" }],
    })
  }

  const imageOk = checkLocalImage(product.imageUrl ?? null)
  const galleryOk = (product.galleryImages?.length ?? 0) > 0

  const checks = [
    { name: "Карточка создана",  ok: true,                          value: `ID: ${product.id.slice(0, 8)}...` },
    { name: "Название",          ok: !!product.name,                value: product.name.slice(0, 60) },
    { name: "Описание",          ok: product.description.length > 10, value: `${product.description.length} символов` },
    { name: "Цена",              ok: product.price > 0,             value: `${product.price} ₽`, error: product.price <= 0 ? "Цена не спарсилась, установите вручную" : undefined },
    { name: "Главное фото",      ok: imageOk,                       value: product.imageUrl ?? undefined, error: !imageOk ? "Файл не найден на сервере" : undefined },
    { name: "Галерея",           ok: galleryOk,                     value: galleryOk ? `${product.galleryImages?.length} фото` : "нет доп. фото" },
    { name: "Категория",         ok: !!product.categoryId,          value: product.category?.name, error: !product.categoryId ? "Категория не определена — назначьте вручную" : undefined },
    { name: "SEO Title",         ok: !!product.metaTitle,           value: product.metaTitle?.slice(0, 50) },
    { name: "SEO Description",   ok: !!product.metaDescription,     value: product.metaDescription ? `${product.metaDescription.length} симв.` : undefined },
    { name: "URL (slug)",        ok: !!product.slug,                value: `/product/${product.slug}` },
    { name: "Статус публикации", ok: product.isActive,              value: product.isActive ? "Опубликован" : "Скрыт", error: !product.isActive ? "Товар скрыт — нет цены или нет в наличии" : undefined },
    { name: "Наличие",           ok: product.inStock,               value: product.inStock ? "В наличии" : "Нет в наличии" },
  ]

  const allOk = checks.every(c => c.ok)

  return NextResponse.json({
    found: true,
    productId,
    product: {
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      isActive: product.isActive,
      inStock: product.inStock,
      imageUrl: product.imageUrl,
      galleryCount: product.galleryImages?.length ?? 0,
      hasCategory: !!product.categoryId,
      categoryName: product.category?.name,
      hasSeo: !!product.metaTitle,
      importSource: product.importSource,
      importedAt: product.importedAt,
    },
    checks,
    allOk,
    productUrl: `/product/${product.slug}`,
  })
}
