import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/auth"
import { prisma } from "../../../lib/prisma"
import { rateLimit } from "../../../lib/rate-limit"
import { z } from "zod"

const PostSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(10, "Минимум 10 символов").max(2000, "Максимум 2000 символов").trim(),
})

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId")
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 })
  }

  const reviews = await prisma.review.findMany({
    where: { productId, isApproved: true },
    select: {
      id: true,
      rating: true,
      text: true,
      authorName: true,
      createdAt: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return NextResponse.json(reviews)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Необходимо войти в аккаунт" }, { status: 401 })
  }

  // Rate limit: не более 5 отзывов в час с одного пользователя
  if (!rateLimit(`review:${session.user.id}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Слишком много запросов. Попробуйте позже." }, { status: 429 })
  }

  const body = await req.json().catch(() => null)
  const parsed = PostSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Некорректные данные"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { productId, rating, text } = parsed.data

  // Проверяем существование товара
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  })
  if (!product) {
    return NextResponse.json({ error: "Товар не найден" }, { status: 404 })
  }

  // Один отзыв на товар от пользователя
  const existing = await prisma.review.findUnique({
    where: { productId_userId: { productId, userId: session.user.id } },
  })
  if (existing) {
    return NextResponse.json({ error: "Вы уже оставили отзыв на этот товар" }, { status: 409 })
  }

  const review = await prisma.review.create({
    data: { productId, userId: session.user.id, rating, text },
    select: {
      id: true,
      rating: true,
      text: true,
      authorName: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  })

  // Обновляем средний рейтинг и количество отзывов в модели Product
  const agg = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { id: true },
  })
  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: agg._avg.rating ?? 0,
      reviewCount: agg._count.id,
    },
  })

  return NextResponse.json({ ok: true, review }, { status: 201 })
}
