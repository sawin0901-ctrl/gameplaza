import Link from "next/link"
import Image from "next/image"
import WishlistButton from "./WishlistButton"

interface Props {
  id?: string
  slug: string
  name: string
  price: number
  oldPrice?: number | null
  discountPercent?: number | null
  imageUrl?: string | null
  category?: string | null
  rating?: number | null
  reviewCount?: number | null
  soldCount?: number
  isNew?: boolean
  digisellerProductId?: number
  initialWishlisted?: boolean
}

export default function ProductCard({
  id, slug, name, price, oldPrice, discountPercent, imageUrl,
  category, rating, reviewCount, soldCount, isNew,
  digisellerProductId, initialWishlisted,
}: Props) {
  const discount = discountPercent ?? (oldPrice && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : null)
  const imgSrc = imageUrl || (digisellerProductId
    ? `https://graph.digiseller.ru/img.ashx?id_d=${digisellerProductId}&maxlength=400`
    : null)

  return (
    <div className="group card-hover overflow-hidden flex flex-col rounded-xl">

      {/* Image — square container matching Plati.Market CDN format */}
      <div className="relative aspect-square overflow-hidden bg-[var(--bg-2,#1a1a26)] flex-shrink-0">
        <Link href={`/product/${slug}`} className="block absolute inset-0">
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={name}
              fill
              unoptimized={!imgSrc.startsWith("/_next/")}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand/10 to-purple-950/30">
              <svg className="w-14 h-14 text-brand/20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5S14.67 12 15.5 12s1.5.67 1.5 1.5S16.33 15 15.5 15zm3-3c-.83 0-1.5-.67-1.5-1.5S17.67 10 18.5 10s1.5.67 1.5 1.5S19.33 12 18.5 12z"/>
              </svg>
            </div>
          )}
        </Link>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1 pointer-events-none z-10">
          {isNew && <span className="badge bg-emerald-500 text-white">Новинка</span>}
          {discount && discount > 0 && <span className="badge bg-red-500 text-white">-{discount}%</span>}
        </div>

        {/* Wishlist */}
        {id && (
          <div className="absolute top-2 right-2 z-10">
            <WishlistButton productId={id} initialWishlisted={initialWishlisted} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col flex-1 gap-2">

        {/* Title */}
        <Link href={`/product/${slug}`} className="flex-1">
          <h3 className="text-[var(--text)] text-sm font-medium line-clamp-2 leading-snug group-hover:text-brand transition-colors">
            {name}
          </h3>
        </Link>

        {/* Sold count */}
        {soldCount && soldCount > 0 ? (
          <span className="text-[var(--text-3)] text-xs">куплено {soldCount.toLocaleString("ru-RU")}</span>
        ) : null}

        {/* Price + button */}
        <div className="mt-auto pt-1.5 flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {oldPrice && oldPrice > price && (
              <span className="text-[var(--text-3)] text-xs line-through">{oldPrice.toLocaleString("ru-RU")} ₽</span>
            )}
            {price > 50 ? (
              <span className="text-[var(--text)] font-bold text-lg leading-none">{price.toLocaleString("ru-RU")} ₽</span>
            ) : (
              <span className="text-[var(--text-3)] text-sm leading-none">Цена уточняется</span>
            )}
          </div>
          <Link
            href={`/product/${slug}`}
            className="btn-primary w-full text-center text-sm py-2 rounded-lg"
          >
            Купить
          </Link>
        </div>

      </div>
    </div>
  )
}
