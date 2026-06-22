interface Props {
  price: number
  oldPrice: number | null
  inStock: boolean
  platiUrl: string
}

export default function PlatiMarketWidget({ price, oldPrice, inStock, platiUrl }: Props) {
  return (
    <div className="card p-5 min-w-[260px]">
      <div className="text-2xl font-bold text-white mb-1">
        {price.toLocaleString("ru-RU")} &#8381;
      </div>
      {oldPrice && oldPrice > price && (
        <div className="text-sm text-gray-500 line-through mb-3">
          {oldPrice.toLocaleString("ru-RU")} &#8381;
        </div>
      )}
      <div className="flex items-center gap-2 mb-4">
        {inStock ? (
          <>
            <span className="w-2 h-2 bg-emerald-400 rounded-full shrink-0" />
            <span className="text-emerald-400 text-sm font-medium">В наличии</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 bg-red-400 rounded-full shrink-0" />
            <span className="text-red-400 text-sm font-medium">Нет в наличии</span>
          </>
        )}
      </div>
      <a
        href={platiUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center btn-primary py-3 text-base font-semibold rounded-lg"
      >
        Купить
      </a>
      <p className="text-xs text-gray-600 text-center mt-2">Продаётся на Plati.Market</p>
    </div>
  )
}