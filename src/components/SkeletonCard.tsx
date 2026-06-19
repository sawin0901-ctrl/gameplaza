export default function SkeletonCard() {
  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-gray-700" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-gray-700 rounded w-1/3" />
        <div className="h-4 bg-gray-700 rounded w-full" />
        <div className="h-4 bg-gray-700 rounded w-2/3" />
        <div className="h-5 bg-gray-700 rounded w-1/4 mt-2" />
      </div>
    </div>
  )
}