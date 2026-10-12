"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SaleDialog } from "@/components/admin/sale-dialog"
import { formatPrice, STATUS_LABEL, type ItemStatus } from "@/lib/format"
import { PAYMENT_LABEL, paymentStatusLabel, type SaleValues } from "@/lib/sale-shared"

/** Quadro "Venda" na página de edição do item. */
export function SaleSection({
  itemId,
  itemTitle,
  listPrice,
  status,
  sale,
}: {
  itemId: string
  itemTitle: string
  listPrice: number
  status: string
  sale: SaleValues | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const available = status === "disponivel"

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-olive-soft text-olive">
        <Receipt className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-bold">Venda</h2>
        <p className="text-sm text-muted-foreground">
          {available
            ? "Ainda disponível. Ao registrar a venda, o item passa a aparecer como vendido no site."
            : sale
              ? [
                  STATUS_LABEL[status as ItemStatus] ?? status,
                  paymentStatusLabel(sale.paidPercent),
                  sale.paymentMethod ? PAYMENT_LABEL[sale.paymentMethod] : null,
                  sale.finalPrice !== "" ? formatPrice(Number(sale.finalPrice)) : null,
                  sale.buyerName || null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : `${STATUS_LABEL[status as ItemStatus] ?? status} · dados da venda ainda não preenchidos`}
        </p>
      </div>
      <Button className="h-10 rounded-full px-5" onClick={() => setOpen(true)}>
        {available ? "Registrar venda" : sale ? "Editar dados da venda" : "Preencher dados da venda"}
      </Button>
      {open && (
        <SaleDialog
          itemId={itemId}
          itemTitle={itemTitle}
          listPrice={listPrice}
          initial={sale}
          markSold={available}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            router.refresh()
          }}
        />
      )}
    </section>
  )
}
