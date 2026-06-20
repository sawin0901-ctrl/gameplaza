export default function ProductLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 animate-pulse">
      <div className="h-4 w-64 bg-[#1a1a26] rounded mb-6" />
      <div className="grid md:grid-cols-2 gap-10">
        <div className="aspect-video rounded-xl bg-[#1a1a26]" />
        <div className="space-y-4">
          <div className="h-4 w-24 bg-[#1a1a26] rounded" />
          <div className="h-8 w-full bg-[#1a1a26] rounded" />
          <div className="h-8 w-2/3 bg-[#1a1a26] rounded" />
          <div className="h-4 w-28 bg-[#1a1a26] rounded" />
          <div className="h-24 bg-[#1a1a26] rounded-xl mt-4" />
        </div>
      </div>
      <div className="mt-10">
        <div className="h-6 w-32 bg-[#1a1a26] rounded mb-4" />
        <div className="h-40 bg-[#1a1a26] rounded-xl" />
      </div>
    </div>
  )
}
