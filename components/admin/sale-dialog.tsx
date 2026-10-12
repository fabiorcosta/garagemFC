"use client"

import { useEffect, useState } from "react"
import { Loader2, Receipt } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { adminFetch } from "@/lib/admin-fetch"
import { formatPrice } from "@/lib/format"
import { todayInput } from "@/lib/pickup-date"
import { PAYMENT_LABEL, PAYMENT_METHODS, paymentStatusLabel, type SaleValues } from "@/lib/sale-shared"

const selectCls =
  "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"

export const EMPTY_SALE: SaleValues = {
  buyerName: "",
  finalPrice: "",
  paidPercent: 0,
  paymentMethod: "",
  soldAt: "",
  notes: "",
}

/** Registro privado da venda (só aparece no admin). */
export function SaleDialog({
  itemId,
  itemTitle,
  listPrice,
  initial,
  onClose,
  onSaved,
}: {
  itemId: string
  itemTitle: string
  listPrice: number
  initial: SaleValues | null
  onClose: () => void
  onSaved: () => void
}) {
  const [v, setV] = useState<SaleValues>(
    () => initial ?? { ...EMPTY_SALE, finalPrice: listPrice, soldAt: todayInput() },
  )
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof SaleValues>(k: K, val: SaleValues[K]) => setV((p) => ({ ...p, [k]: val }))

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  const price = v.finalPrice === "" ? 0 : Number(v.finalPrice)
  const received = Math.round((price * v.paidPercent) / 100)

  async function save() {
    setSaving(true)
    try {
      await adminFetch(`/api/admin/items/${itemId}/sale`, "PUT", {
        ...v,
        finalPrice: v.finalPrice === "" ? null : Number(v.finalPrice),
      })
      toast.success("Dados da venda salvos")
      onSaved()
    } catch (e) {
      toast.error((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-3xl bg-card p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-olive-soft text-olive">
            <Receipt className="size-5" aria-hidden />
          </span>
          <div>
            <h2 id="sale-title" className="text-lg leading-snug font-bold">
              Dados da venda
            </h2>
            <p className="text-sm text-muted-foreground">{itemTitle} · só você vê isto</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="buyerName">Comprador</Label>
            <Input id="buyerName" maxLength={80} value={v.buyerName} onChange={(e) => set("buyerName", e.target.value)} className="h-10" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="finalPrice">Valor da venda (R$)</Label>
            <Input
              id="finalPrice"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={v.finalPrice}
              onChange={(e) => set("finalPrice", e.target.value === "" ? "" : Number(e.target.value))}
              className="h-10"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="paymentMethod">Forma de pagamento</Label>
            <select
              id="paymentMethod"
              value={v.paymentMethod}
              onChange={(e) => set("paymentMethod", e.target.value as SaleValues["paymentMethod"])}
              className={selectCls}
            >
              <option value="">—</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_LABEL[m]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="paidPercent">Pago</Label>
              <span className="text-sm font-semibold">
                {paymentStatusLabel(v.paidPercent)}
                {price > 0 && ` · ${formatPrice(received)} de ${formatPrice(price)}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="paidPercent"
                type="range"
                min={0}
                max={100}
                step={5}
                value={v.paidPercent}
                onChange={(e) => set("paidPercent", Number(e.target.value))}
                className="flex-1 accent-[var(--olive)]"
              />
              <Input
                aria-label="Percentual pago"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                value={v.paidPercent}
                onChange={(e) => set("paidPercent", Math.max(0, Math.min(100, Math.trunc(Number(e.target.value) || 0))))}
                className="h-9 w-20"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <div className="flex gap-2">
              {[0, 20, 50, 100].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set("paidPercent", p)}
                  className="h-7 rounded-full border px-3 text-xs font-semibold hover:bg-muted"
                >
                  {p === 0 ? "Não pago" : p === 100 ? "Pago" : `${p}%`}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="soldAt">Data da venda</Label>
            <Input id="soldAt" type="date" value={v.soldAt} onChange={(e) => set("soldAt", e.target.value)} className="h-10" />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              rows={2}
              maxLength={500}
              placeholder="Ex.: sinal pago, resto na retirada; telefone do comprador…"
              value={v.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11 rounded-full" onClick={onClose}>
            Agora não
          </Button>
          <Button className="h-11 rounded-full font-semibold" disabled={saving} onClick={save}>
            {saving && <Loader2 className="animate-spin" />}
            Salvar venda
          </Button>
        </div>
      </div>
    </div>
  )
}
