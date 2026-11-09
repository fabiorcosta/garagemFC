"use client"

import { useState } from "react"
import { ImageOff } from "lucide-react"

/** Foto do item com reserva visual: sem foto ou se ela falhar, mostra um ícone no lugar. */
export function EventPhoto({ src, alt, priority = false }: { src: string | null; alt: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="relative aspect-square overflow-hidden bg-muted">
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- fotos locais já comprimidas; sem otimizador no servidor
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground/60">
          <ImageOff className="size-8" aria-hidden />
          <span className="text-xs">Foto em breve</span>
        </div>
      )}
    </div>
  )
}
