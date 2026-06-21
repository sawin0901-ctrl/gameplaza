"use client"
import { useState, useEffect, useCallback } from "react"
import Image from "next/image"

interface GalleryImage {
  url: string
  alt: string
}

interface Props {
  images: GalleryImage[]
}

function GalleryImg({ src, alt, fill, sizes, className, priority }: {
  src: string; alt: string; fill?: boolean; sizes?: string; className?: string; priority?: boolean
}) {
  const unoptimized = !src.startsWith("/uploads/")
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      sizes={sizes}
      className={className}
      priority={priority}
      unoptimized={unoptimized}
    />
  )
}

export default function ImageGallery({ images }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null)

  const close = useCallback(() => setLightbox(null), [])

  const prev = useCallback(() => {
    setLightbox(i => (i === null ? null : (i - 1 + images.length) % images.length))
  }, [images.length])

  const next = useCallback(() => {
    setLightbox(i => (i === null ? null : (i + 1) % images.length))
  }, [images.length])

  useEffect(() => {
    if (lightbox === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      if (e.key === "ArrowLeft") prev()
      if (e.key === "ArrowRight") next()
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [lightbox, close, prev, next])

  if (images.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600">
        <div className="text-4xl mb-3">🖼️</div>
        <p>Изображения отсутствуют</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setLightbox(i)}
            className="group relative aspect-square rounded-xl overflow-hidden bg-[#1a1a26] hover:ring-2 hover:ring-brand transition-all"
          >
            <GalleryImg
              src={img.url}
              alt={img.alt}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              className="object-contain group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white text-2xl transition-opacity">
                🔍
              </span>
            </div>
          </button>
        ))}
      </div>

      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={close}
        >
          <button
            onClick={close}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl z-10"
            aria-label="Закрыть"
          >
            ×
          </button>

          {images.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
              {lightbox + 1} / {images.length}
            </div>
          )}

          <div
            className="relative w-full max-w-3xl max-h-[80vh] aspect-square"
            onClick={e => e.stopPropagation()}
          >
            <GalleryImg
              src={images[lightbox].url}
              alt={images[lightbox].alt}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-contain"
              priority
            />
          </div>

          {images.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); prev() }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                aria-label="Предыдущее"
              >
                ‹
              </button>
              <button
                onClick={e => { e.stopPropagation(); next() }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                aria-label="Следующее"
              >
                ›
              </button>
            </>
          )}

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setLightbox(i) }}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 transition-all ${
                    i === lightbox ? "ring-2 ring-brand" : "opacity-50 hover:opacity-80"
                  }`}
                >
                  <GalleryImg src={img.url} alt={img.alt} fill sizes="48px" className="object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}