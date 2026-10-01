"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink, Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { adminFetch } from "@/lib/admin-fetch"
import { TEXT_GROUPS, TEXTS, type TextGroup, type TextKey } from "@/lib/site-texts"

export type SettingsValues = {
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
  showCountdown: boolean
  showStats: boolean
  texts: Partial<Record<TextKey, string>>
}

type FieldKey = Exclude<keyof SettingsValues, "texts" | "showCountdown" | "showStats">
type Field = { key: FieldKey; label: string; hint?: string; type?: string; multiline?: boolean; max: number }

type Block =
  | { kind: "fields"; title: string; fields: Field[] }
  | { kind: "texts"; title: string; group: TextGroup; only?: TextKey[]; skip?: TextKey[] }
  | { kind: "switches"; title: string }

const TABS: { id: string; label: string; blocks: Block[] }[] = [
  {
    id: "banner",
    label: "Banner e avisos",
    blocks: [
      {
        kind: "fields",
        title: "Banner da página inicial",
        fields: [
          { key: "siteTitle", label: "Nome do site (topo e aba do navegador)", max: 60 },
          { key: "heroTitle", label: "Título do banner", max: 120 },
          { key: "heroSubtitle", label: "Texto do banner", multiline: true, max: 300 },
          { key: "announcement", label: "Faixa de aviso no topo do site", hint: "Ex: \"Tudo com 20% off neste fim de semana!\" — vazio esconde a faixa", max: 160 },
        ],
      },
      { kind: "switches", title: "O que aparece na página inicial" },
      { kind: "texts", title: "Textos da página inicial", group: "inicio" },
    ],
  },
  {
    id: "retirada",
    label: "Retirada e datas",
    blocks: [
      {
        kind: "fields",
        title: "Prazo e local",
        fields: [
          { key: "saleEndDate", label: "Data final da venda", type: "date", hint: "Usada na contagem regressiva e no aviso de prazo", max: 10 },
          { key: "pickupCity", label: "Cidade", max: 80 },
          { key: "pickupNeighborhood", label: "Bairro", max: 80 },
        ],
      },
      { kind: "texts", title: "Endereço e horários", group: "retirada", only: ["pickupAddress", "pickupHours", "pickupMapUrl"] },
      {
        kind: "fields",
        title: "Pagamento e regras",
        fields: [
          { key: "paymentInfo", label: "Formas de pagamento", multiline: true, max: 2000 },
          { key: "pickupInfo", label: "Regras de retirada", multiline: true, max: 2000 },
        ],
      },
      { kind: "texts", title: "Textos da página de retirada", group: "retirada", skip: ["pickupAddress", "pickupHours", "pickupMapUrl"] },
    ],
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    blocks: [
      {
        kind: "fields",
        title: "Número",
        fields: [{ key: "whatsapp", label: "WhatsApp", hint: "DDD + número, ex: 11 99999-9999", type: "tel", max: 20 }],
      },
      { kind: "texts", title: "Mensagens prontas", group: "whatsapp" },
    ],
  },
  {
    id: "textos",
    label: "Textos do site",
    blocks: [
      { kind: "texts", title: TEXT_GROUPS.catalogo, group: "catalogo" },
      { kind: "texts", title: TEXT_GROUPS.item, group: "item" },
      { kind: "texts", title: TEXT_GROUPS.geral, group: "geral" },
      { kind: "texts", title: TEXT_GROUPS.privacidade, group: "privacidade" },
    ],
  },
]

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [tab, setTab] = useState(TABS[0].id)
  const [saving, setSaving] = useState(false)
  const current = TABS.find((t) => t.id === tab) ?? TABS[0]

  const setText = (key: TextKey, v: string) => setValues((prev) => ({ ...prev, texts: { ...prev.texts, [key]: v } }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await adminFetch("/api/admin/settings", "PUT", { ...values, saleEndDate: values.saleEndDate || null })
      toast.success("Configurações salvas — o site já foi atualizado")
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "h-9 shrink-0 rounded-full border px-4 text-sm font-semibold",
              tab === t.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {current.blocks.map((b) => (
        <section key={b.title} className="grid gap-4 rounded-2xl border bg-card p-4 sm:p-5">
          <h2 className="font-bold">{b.title}</h2>

          {b.kind === "fields" &&
            b.fields.map((f) => (
              <div key={f.key} className="grid gap-1.5">
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
                    className="h-10 w-full"
                  />
                )}
                {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
              </div>
            ))}

          {b.kind === "switches" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <SwitchRow
                label="Contagem regressiva"
                hint={'"Faltam X dias" no banner'}
                checked={values.showCountdown}
                onChange={(v) => setValues({ ...values, showCountdown: v })}
              />
              <SwitchRow
                label="Números da venda"
                hint="Disponíveis / reservados / vendidos"
                checked={values.showStats}
                onChange={(v) => setValues({ ...values, showStats: v })}
              />
            </div>
          )}

          {b.kind === "texts" &&
            (Object.keys(TEXTS) as TextKey[])
              .filter((k) => TEXTS[k].group === b.group)
              .filter((k) => !b.only || b.only.includes(k))
              .filter((k) => !b.skip?.includes(k))
              .map((k) => {
                const def = TEXTS[k] as (typeof TEXTS)[TextKey] & { multiline?: boolean; hint?: string }
                const value = values.texts[k] ?? ""
                const custom = value.trim() !== "" && value !== def.default
                return (
                  <div key={k} className="grid gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={`t-${k}`}>{def.label}</Label>
                      {custom && def.default && (
                        <button
                          type="button"
                          onClick={() => setText(k, "")}
                          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
                        >
                          <RotateCcw className="size-3" /> Voltar ao padrão
                        </button>
                      )}
                    </div>
                    {def.multiline ? (
                      <Textarea
                        id={`t-${k}`}
                        rows={k === "conditions" ? 6 : 2}
                        maxLength={def.max}
                        placeholder={def.default}
                        value={value}
                        onChange={(e) => setText(k, e.target.value)}
                      />
                    ) : (
                      <Input
                        id={`t-${k}`}
                        maxLength={def.max}
                        placeholder={def.default}
                        value={value}
                        onChange={(e) => setText(k, e.target.value)}
                        className="h-10 w-full"
                      />
                    )}
                    {def.hint && <p className="text-xs text-muted-foreground">{def.hint}</p>}
                  </div>
                )
              })}
        </section>
      ))}

      <p className="text-xs text-muted-foreground">
        Campos em cinza mostram o texto padrão: deixe vazio para usar o padrão. Os ajustes das outras abas também são
        salvos juntos.{" "}
        <a href="/" target="_blank" className="inline-flex items-center gap-0.5 font-medium text-primary">
          Ver site <ExternalLink className="size-3" />
        </a>
      </p>

      <div className="sticky bottom-20 z-20 flex justify-end md:bottom-4">
        <Button type="submit" disabled={saving} className="h-11 rounded-full px-6 text-base font-semibold shadow-lg">
          {saving && <Loader2 className="animate-spin" />}
          Salvar
        </Button>
      </div>
    </form>
  )
}

function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border p-3">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}
