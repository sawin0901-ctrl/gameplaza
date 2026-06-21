"use client"
import { useEffect } from "react"

interface Product {
  id: string
  slug: string
  name: string
  imageUrl: string | null
  price: number
}

const KEY = "gp-recent"
const MAX = 6

export function RecentlyViewedSaver({ product }: { product: Product }) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      const list: Product[] = raw ? JSON.parse(raw) : []
      const next = [product, ...list.filter(p => p.id !== product.id)].slice(0, MAX)
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {}
  }, [product.id])
  return null
}