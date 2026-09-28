"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { adminFetch } from "@/lib/admin-fetch"

type Values = {
  siteTitle: string
  heroTitle: string
  heroSubtitle: string
  whatsapp: string
  saleEndDate: string
  pickupCity: string
  pickupNeighborhood: string
  pickupInfo: string
  paymentInfo: string
  announcement: string
}

type Field = { key: keyof Values; label: string; hint?: string; type?: string; multiline?: boolean; max: number; wide?: boolean }

const groups: { title: string; fields: Field[] }[] = [
  {
    title: "Página inicial",
    fields: [
      { key: "siteTitle", label: "Título do site", max: 60 },
      { key: "announcement", label: "Faixa de aviso (topo do site)", hint: "Deixe vazio para esconder", max: 160 },
      { key: "heroTitle", label: "Título do destaque", max: 120, wide: true },
      { key: "heroSubtitle", label: "Subtítulo do destaque", multiline: true, max: 300, wide: true },
    ],
  },
  {
    title: "Contato e prazo",
    fields: [
      { key: "whatsapp", label: "WhatsApp", hint: "DDD + número, ex: 11 99999-9999", type: "tel", max: 20 },
      { key: "saleEndDate", label: "Data final da venda", type: "date", max: 10 },
    ],
  },
  {
    title: "Retirada e pagamento",
    fields: [
      { key: "pickupCity", label: "Cidade", max: 80 },
      { key: "pickupNeighborhood", label: "Bairro", max: 80 },
      { key: "pickupInfo", label: "Regras de retirada", multiline: true, max: 2000, wide: true },
      { key: "paymentInfo", label: "Formas de pagamento", multiline: true, max: 2000, wide: true },
    ],
  },
]

export function SettingsForm({ initial }: { initial: Values }) {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await adminFetch("/api/admin/settings", "PUT", { ...values, saleEndDate: values.saleEndDate || null })
      toast.success("Configurações salvas")
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {groups.map((g) => (
        <section key={g.title} className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-2 sm:p-5">
          <h2 className="font-bold sm:col-span-2">{g.title}</h2>
          {g.fields.map((f) => (
            <div key={f.key} className={f.wide ? "grid gap-1.5 sm:col-span-2" : "grid gap-1.5"}>
              <Label htmlFor={f.key}>{f.label}</Label>
              {f.multiline ? (
                <Textarea
                  id={f.key}
                  rows={3}
                  maxLength={f.max}
                  value={values[f.key]}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              ) : (
                <Input
                  id={f.key}
                  type={f.type ?? "text"}
                  maxLength={f.max}
                  value={values[f.key]}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  className="h-10"
                />
              )}
              {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
            </div>
          ))}
        </section>
      ))}
      <div className="sticky bottom-20 z-20 flex justify-end md:bottom-4">
        <Button type="submit" disabled={saving} className="h-11 rounded-full px-6 text-base font-semibold shadow-lg">
          {saving && <Loader2 className="animate-spin" />}
          Salvar
        </Button>
      </div>
    </form>
  )
}
