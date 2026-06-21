"use client"
import { useState, useEffect, useCallback } from "react"

interface GalleryImage {
  url: string
  alt: string
}

interface Props {
  images: GalleryImage[]
}

export default function ImageGallery({ images }: Props) {
  const [failed, setFailed]   = useState<Set<number>>(new Set())
  const [lightbox, setLightbox] = useState<number | null>(null)

  const visible = images.filter((_, i) => !failed.has(i))

  const onErr = (i: number) => setFailed(prev => new Set([...prev, i]))

  const idxInVisible = lightbox !== null ? visible.findIndex((_, vi) => {
    let orig = 0, seen = 0
    for (let i = 0; i < images.length; i++) {
      if (failed.has(i)) continue
      if (seen === vi) { orig = i; break }
      seen++
    }
    return orig === lightbox
  }) : -1

  const close = useCallback(() => setLightbox(null), [])
  const prev  = useCallback(() => {
    if (lightbox === null) return
    const cur = visible.indexOf(images[lightbox])
    const prevImg = visible[(cur - 1 + visible.length) % visible.length]
    setLightbox(images.indexOf(prevImg))
  }, [lightbox, images, visible])
  const next  = useCallback(() => {
    if (lightbox === null) return
    const cur = visible.indexOf(images[lightbox])
    const nextImg = visible[(cur + 1) % visible.length]
    setLightbox(images.indexOf(nextImg))
  }, [lightbox, images, visible])

  useEffect(() => {
    if (lightbox === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      if (e.key === "ArrowLeft") prev()
      if (e.key === "ArrowRight") next()
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = "" }
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
            onClick={() => !failed.has(i) && setLightbox(i)}
            className={`group relative aspect-square rounded-xl overflow-hidden bg-[#1a1a26] hover:ring-2 hover:ring-brand transition-all ${failed.has(i) ? "hidden" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.alt}
              onError={() => onErr(i)}
              className="absolute inset-0 w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
              <span className="opacity-0 group-hover:opacity-100 text-white text-2xl transition-opacity">🔍</span>
            </div>
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="text-center py-12 text-gray-600">
          <div className="text-4xl mb-3">🖼️</div>
          <p>Изображения недоступны</p>
        </div>
      )}

      {lightbox !== null && !failed.has(lightbox) && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={close}>
          <button onClick={close} className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl z-10" aria-label="Закрыть">×</button>

          {visible.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
              {(visible.indexOf(images[lightbox]) + 1)} / {visible.length}
            </div>
          )}

          <div className="relative w-full max-w-3xl max-h-[80vh] aspect-square" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[lightbox].url}
              alt={images[lightbox].alt}
              className="w-full h-full object-contain"
            />
          </div>

          {visible.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); prev() }} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors" aria-label="Предыдущее">‹</button>
              <button onClick={e => { e.stopPropagation(); next() }} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors" aria-label="Следующее">›</button>
            </>
          )}

          {visible.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto">
              {images.map((img, i) => !failed.has(i) && (
                <button key={i} onClick={e => { e.stopPropagation(); setLightbox(i) }}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 transition-all ${i === lightbox ? "ring-2 ring-brand" : "opacity-50 hover:opacity-80"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}