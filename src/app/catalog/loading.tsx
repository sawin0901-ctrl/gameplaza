import SkeletonCard from "../../components/SkeletonCard"

export default function CatalogLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="h-5 w-48 bg-[#1a1a26] rounded animate-pulse mb-6" />
      <div className="flex gap-6 items-start">
        <div className="w-56 flex-shrink-0 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 bg-[#1a1a26] rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
