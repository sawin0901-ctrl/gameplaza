import Link from "next/link"
import Image from "next/image"
import DigisellerWidget from "./DigisellerWidget"

interface Props {
  slug: string
  name: string
  price: number
  imageUrl?: string | null
  category?: string | null
  isNew?: boolean
  digisellerProductId?: number
}

export default function ProductCard({ slug, name, price, imageUrl, category, isNew, digisellerProductId }: Props) {
  return (
    <div className="group card hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5 overflow-hidden flex flex-col">
      {/* Image — ссылка на страницу товара */}
      <Link href={`/product/${slug}`} className="block flex-shrink-0">
        <div className="relative aspect-[16/9] bg-[#1a1a26] overflow-hidden">
          {imageUrl ? (
            <Image src={imageUrl} alt={name} fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand/10 to-purple-900/20">
              <span className="text-5xl opacity-20">🎮</span>
            </div>
          )}
          {isNew && (
            <div className="absolute top-2 left-2">
              <span className="badge bg-emerald-500 text-white">Новинка</span>
            </div>
          )}
        </div>
      </Link>

      {/* Контент карточки */}
      <div className="p-4 flex flex-col flex-1">
        {category && <p className="text-brand text-xs font-medium mb-1 truncate">{category}</p>}
        <Link href={`/product/${slug}`}>
          <h3 className="text-white text-sm font-medium line-clamp-2 leading-snug mb-3 min-h-[2.5rem] group-hover:text-brand-400 transition-colors">
            {name}
          </h3>
        </Link>

        {/* Виджет Digiseller: живая цена + кнопка покупки */}
        <div className="mt-auto">
          {digisellerProductId ? (
            <DigisellerWidget productId={digisellerProductId} mode="card" />
          ) : (
            <p className="text-brand font-bold text-lg">{price.toLocaleString("ru-RU")} ₽</p>
          )}
        </div>
      </div>
    </div>
  )
}
