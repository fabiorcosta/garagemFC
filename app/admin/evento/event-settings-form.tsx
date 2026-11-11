"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { adminFetch } from "@/lib/admin-fetch"

export type EventSettings = {
  eventDate: string
  eventStart: string
  eventEnd: string
  eventPlace: string
  eventInstructions: string
}

/** Data, horário, local e instruções do evento: aparecem na página /so-no-evento. */
export function EventSettingsForm({ initial }: { initial: EventSettings }) {
  const router = useRouter()
  const [v, setV] = useState(initial)
  const [busy, setBusy] = useState(false)
  const set = (k: keyof EventSettings, value: string) => setV((p) => ({ ...p, [k]: value }))
  const dirty = JSON.stringify(v) !== JSON.stringify(initial)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await adminFetch("/api/admin/event-settings", "PUT", v)
      toast.success("Dados do evento salvos")
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
      <div>
        <h2 className="font-bold">Dados do evento</h2>
        <p className="text-xs text-muted-foreground">Aparecem no topo da página do evento. Campo vazio = &quot;a confirmar&quot;.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="ev-date">Data</Label>
          <Input id="ev-date" type="date" min="2026-01-01" max="2027-12-31" value={v.eventDate} onChange={(e) => set("eventDate", e.target.value)} className="h-10" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ev-start">Começa às</Label>
          <Input id="ev-start" type="time" value={v.eventStart} onChange={(e) => set("eventStart", e.target.value)} className="h-10" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ev-end">Termina às</Label>
          <Input id="ev-end" type="time" value={v.eventEnd} onChange={(e) => set("eventEnd", e.target.value)} className="h-10" />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ev-place">Local</Label>
        <Input
          id="ev-place"
          value={v.eventPlace}
          maxLength={160}
          onChange={(e) => set("eventPlace", e.target.value)}
          className="h-10"
          placeholder="Cond. Teresa Cristina — Av. Juscelino K. de Oliveira, 1775, Jundiaí – SP"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ev-instr">Instruções (opcional)</Label>
        <Textarea
          id="ev-instr"
          rows={3}
          maxLength={600}
          value={v.eventInstructions}
          onChange={(e) => set("eventInstructions", e.target.value)}
          placeholder="Pagamento em Pix ou dinheiro. Leve sacola. Estacionamento na rua."
        />
        <span className="text-xs text-muted-foreground">{v.eventInstructions.length}/600</span>
      </div>
      <Button type="submit" disabled={busy || !dirty} className="h-10 self-start rounded-full px-5">
        <Check /> Salvar dados do evento
      </Button>
    </form>
  )
}
