"use client"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

interface Props {
  productId: string
  initialWishlisted?: boolean
}

export default function WishlistButton({ productId, initialWishlisted = false }: Props) {
  const { data: session } = useSession()
  const router = useRouter()
  const [isWishlisted, setIsWishlisted] = useState(initialWishlisted)
  const [loading, setLoading] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!session) {
      router.push("/auth/login")
      return
    }

    setLoading(true)
    const next = !isWishlisted
    setIsWishlisted(next) // optimistic

    try {
      if (next) {
        await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        })
      } else {
        await fetch(`/api/wishlist?productId=${productId}`, { method: "DELETE" })
      }
    } catch {
      setIsWishlisted(!next) // revert
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={isWishlisted ? "Удалить из избранного" : "Добавить в избранное"}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm
        ${isWishlisted
          ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
          : "bg-black/50 text-gray-400 hover:text-red-400 hover:bg-black/70"
        }
        ${loading ? "opacity-60 cursor-not-allowed" : ""}
      `}
    >
      <svg
        className="w-4 h-4"
        fill={isWishlisted ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </button>
  )
}
