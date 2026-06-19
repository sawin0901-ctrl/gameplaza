import Link from "next/link"
import Image from "next/image"

interface Props {
  slug: string
  name: string
  price: number
  imageUrl?: string | null
  category?: string | null
}

export default function ProductCard({ slug, name, price, imageUrl, category }: Props) {
  return (
    <Link href={`/product/${slug}`} className="group block bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-brand transition-all">
      <div className="relative aspect-video bg-gray-700">
        {imageUrl ? (
          <Image src={imageUrl} alt={name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">Нет фото</div>
        )}
      </div>
      <div className="p-4">
        {category && <p className="text-xs text-brand mb-1">{category}</p>}
        <h3 className="text-sm font-medium text-white line-clamp-2 mb-2">{name}</h3>
        <p className="text-brand font-bold">{price.toLocaleString("ru-RU")} ₽</p>
      </div>
    </Link>
  )
}