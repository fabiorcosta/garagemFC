"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"

export function Gallery({ photos, title, sold }: { photos: string[]; title: string; sold: boolean }) {
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  function go(i: number) {
    const el = track.current
    if (!el) return
    const next = Math.max(0, Math.min(photos.length - 1, i))
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" })
  }

  if (photos.length === 0) {
    return (
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl bg-muted text-muted-foreground/60">
        <ImageOff className="size-12" aria-hidden />
        {sold && <SoldStamp />}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-3xl bg-muted">
        <div
          ref={track}
          onScroll={(e) => {
            const el = e.currentTarget
            setIndex(Math.round(el.scrollLeft / el.clientWidth))
          }}
          className="flex aspect-square snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
        >
          {photos.map((src, i) => (
            <div key={src} className="relative aspect-square w-full shrink-0 snap-center">
              <Image
                src={src}
                alt={`${title} — foto ${i + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className={cn("object-contain", sold && "grayscale")}
                priority={i === 0}
              />
            </div>
          ))}
        </div>
        {sold && <SoldStamp />}
        {photos.length > 1 && (
          <>
            <NavButton side="left" disabled={index === 0} onClick={() => go(index - 1)} />
            <NavButton side="right" disabled={index === photos.length - 1} onClick={() => go(index + 1)} />
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/35 px-2 py-1.5">
              {photos.map((_, i) => (
                <span key={i} className={cn("size-1.5 rounded-full", i === index ? "bg-white" : "bg-white/50")} />
              ))}
            </div>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {photos.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => go(i)}
              aria-label={`Ver foto ${i + 1}`}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-muted",
                i === index ? "border-primary" : "border-transparent opacity-70",
              )}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SoldStamp() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-foreground/40">
      <span className="-rotate-12 rounded-lg border-4 border-white px-6 py-2 text-4xl font-black tracking-widest text-white">
        VENDIDO
      </span>
    </div>
  )
}

function NavButton({ side, disabled, onClick }: { side: "left" | "right"; disabled: boolean; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Foto anterior" : "Próxima foto"}
      className={cn(
        "absolute top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow transition disabled:opacity-0 sm:flex",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-5" />
    </button>
  )
}
