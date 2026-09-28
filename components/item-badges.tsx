import { HandCoins } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatPrice, STATUS_LABEL, type ItemStatus } from "@/lib/format"

const statusStyle: Record<ItemStatus, string> = {
  disponivel: "bg-olive-soft text-olive",
  reservado: "bg-amber text-[#3D2A06]",
  vendido: "bg-foreground text-background",
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = (status in STATUS_LABEL ? status : "disponivel") as ItemStatus
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase",
        statusStyle[s],
        className,
      )}
    >
      {STATUS_LABEL[s]}
    </span>
  )
}

export function OffersBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-olive px-2.5 py-0.5 text-[11px] font-semibold text-olive-foreground",
        className,
      )}
    >
      <HandCoins className="size-3" aria-hidden />
      Aceito ofertas
    </span>
  )
}

export function Price({
  price,
  originalPrice,
  size = "md",
}: {
  price: number
  originalPrice?: number | null
  size?: "md" | "lg"
}) {
  const hasDiscount = originalPrice != null && originalPrice > price
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className={cn("font-extrabold text-primary", size === "lg" ? "text-3xl" : "text-lg")}>
        {formatPrice(price)}
      </span>
      {hasDiscount && (
        <s className={cn("text-muted-foreground", size === "lg" ? "text-base" : "text-xs")}>
          {formatPrice(originalPrice)}
        </s>
      )}
    </div>
  )
}
