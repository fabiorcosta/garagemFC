"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Foto em tela cheia. Toque/clique na foto alterna zoom 2,5× no ponto tocado; com zoom, arraste para ver
 * os detalhes. Setas, deslizar (sem zoom) e Esc. Bloqueia a rolagem da página enquanto aberta.
 */
export function Lightbox({
  photos,
  title,
  start,
  onClose,
}: {
  photos: string[]
  title: string
  start: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(start)
  const [zoom, setZoom] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const touchX = useRef<number | null>(null)

  const go = (i: number) => {
    setZoom(false)
    setIndex((i + photos.length) % photos.length)
  }

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight") go(index + 1)
      if (e.key === "ArrowLeft") go(index - 1)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  function toggleZoom(e: React.MouseEvent<HTMLImageElement>) {
    const el = box.current
    if (!el) return
    if (zoom) {
      setZoom(false)
      return
    }
    // Centraliza o zoom no ponto tocado
    const rect = e.currentTarget.getBoundingClientRect()
    const fx = (e.clientX - rect.left) / rect.width
    const fy = (e.clientY - rect.top) / rect.height
    setZoom(true)
    requestAnimationFrame(() => {
      el.scrollLeft = fx * el.scrollWidth - el.clientWidth / 2
      el.scrollTop = fy * el.scrollHeight - el.clientHeight / 2
    })
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={`Fotos de ${title}`} className="fixed inset-0 z-[60] flex flex-col bg-black text-white">
      <div className="flex items-center justify-between gap-2 p-3">
        <span className="text-sm font-medium">
          {index + 1} / {photos.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => !z)}
            className="rounded-full p-2.5 hover:bg-white/10"
            aria-label={zoom ? "Diminuir" : "Ampliar"}
          >
            {zoom ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
          </button>
          <button type="button" onClick={onClose} className="rounded-full p-2.5 hover:bg-white/10" aria-label="Fechar" autoFocus>
            <X className="size-6" />
          </button>
        </div>
      </div>

      <div
        ref={box}
        className={cn("relative flex-1", zoom ? "overflow-auto" : "flex items-center justify-center overflow-hidden")}
        onTouchStart={(e) => (touchX.current = zoom ? null : e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1))
          touchX.current = null
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- zoom precisa da imagem no tamanho natural */}
        <img
          key={photos[index]}
          src={photos[index]}
          alt={`${title} — foto ${index + 1}`}
          onClick={toggleZoom}
          className={cn(
            "select-none",
            zoom ? "max-w-none cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain",
          )}
          style={zoom ? { width: "250%" } : undefined}
          draggable={false}
        />
      </div>

      {photos.length > 1 && !zoom && (
        <div className="flex items-center justify-between p-3">
          <button type="button" onClick={() => go(index - 1)} className="rounded-full bg-white/10 p-3 hover:bg-white/20" aria-label="Foto anterior">
            <ChevronLeft className="size-6" />
          </button>
          <span className="text-xs text-white/70">Toque na foto para ampliar</span>
          <button type="button" onClick={() => go(index + 1)} className="rounded-full bg-white/10 p-3 hover:bg-white/20" aria-label="Próxima foto">
            <ChevronRight className="size-6" />
          </button>
        </div>
      )}
    </div>
  )
}
