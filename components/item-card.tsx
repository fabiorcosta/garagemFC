import Image from "next/image"
import Link from "next/link"
import { CalendarClock, ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { photoThumbUrl } from "@/lib/file-url"
import { pickupLabel } from "@/lib/pickup-date"
import type { ItemCardData } from "@/lib/queries"
import { OffersBadge, Price, StatusBadge } from "./item-badges"

export function ItemCard({ item, priority = false }: { item: ItemCardData; priority?: boolean }) {
  const thumb = photoThumbUrl(item.photos[0])
  const sold = item.status === "vendido"
  const pickup = pickupLabel(item.pickupFrom, "short")
  return (
    <Link
      href={`/itens/${item.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {thumb ? (
          <Image
            src={thumb}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn("object-cover transition group-hover:scale-[1.03]", sold && "grayscale")}
            priority={priority}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground/60">
            <ImageOff className="size-8" aria-hidden />
          </div>
        )}
        {item.status !== "disponivel" && (
          <StatusBadge status={item.status} className="absolute top-2 left-2 shadow" />
        )}
        {sold && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/45">
            <span className="-rotate-12 rounded-md border-2 border-white px-3 py-1 text-lg font-black tracking-widest text-white">
              VENDIDO
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm leading-snug font-semibold">{item.title}</h3>
        <div className="mt-auto flex flex-col gap-1.5">
          <Price price={item.price} originalPrice={item.originalPrice} />
          {item.acceptsOffers && !sold && <OffersBadge className="self-start" />}
          {pickup && !sold && (
            <span className="inline-flex items-center gap-1 self-start text-[11px] font-medium text-muted-foreground">
              <CalendarClock className="size-3" aria-hidden />
              Retirada a partir de {pickup}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export function ItemGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4", className)}>{children}</div>
}
