import Link from "next/link"
import Image from "next/image"

interface Props {
  slug: string
  name: string
  price: number
  imageUrl?: string | null
  category?: string | null
  isNew?: boolean
  originalPrice?: number
}

export default function ProductCard({ slug, name, price, imageUrl, category, isNew, originalPrice }: Props) {
  const discount = originalPrice && originalPrice > price
    ? Math.round((1 - price / originalPrice) * 100)
    : 0

  return (
    <Link href={`/product/${slug}`} className="group block">
      <div className="card hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5 overflow-hidden h-full flex flex-col">
        {/* Image */}
        <div className="relative aspect-[16/9] bg-[#1a1a26] overflow-hidden flex-shrink-0">
          {imageUrl ? (
            <Image src={imageUrl} alt={name} fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand/10 to-purple-900/20">
              <span className="text-5xl opacity-20">🎮</span>
            </div>
          )}
          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1">
            {isNew && <span className="badge bg-emerald-500 text-white">Новинка</span>}
            {discount > 0 && <span className="badge bg-red-500 text-white">-{discount}%</span>}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col flex-1">
          {category && <p className="text-brand text-xs font-medium mb-1.5 truncate">{category}</p>}
          <h3 className="text-white text-sm font-medium line-clamp-2 leading-snug mb-3 flex-1 group-hover:text-brand-400 transition-colors">
            {name}
          </h3>
          <div className="flex items-end justify-between mt-auto gap-2">
            <div>
              {originalPrice && originalPrice > price && (
                <p className="text-gray-600 text-xs line-through leading-none mb-0.5">
                  {originalPrice.toLocaleString("ru-RU")} ₽
                </p>
              )}
              <p className="text-brand font-bold text-lg leading-none">
                {price.toLocaleString("ru-RU")} ₽
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center group-hover:bg-brand transition-colors flex-shrink-0">
              <svg className="w-4 h-4 text-brand group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
