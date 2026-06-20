import { prisma } from "../../../lib/prisma"
import AdminProductsClient from "./ProductsClient"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Товары — Admin" }
export const revalidate = 0

export default async function AdminProductsPage({ searchParams }: { searchParams: Record<string, string> }) {
  const page = Math.max(1, Number(searchParams.page ?? 1))
  const q = searchParams.q ?? ""
  const status = searchParams.status ?? "all"
  const PAGE = 50

  const where = {
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(status === "active" ? { isActive: true } : status === "hidden" ? { isActive: false } : {}),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { importedAt: "desc" },
      take: PAGE,
      skip: (page - 1) * PAGE,
      select: {
        id: true, name: true, price: true, isActive: true,
        digisellerProductId: true, categoryId: true,
        category: { select: { name: true } },
      },
    }),
    prisma.product.count({ where }),
  ])

  return (
    <AdminProductsClient
      initialProducts={products}
      initialTotal={total}
      initialPages={Math.ceil(total / PAGE)}
      initialQ={q}
      initialStatus={status}
    />
  )
}
