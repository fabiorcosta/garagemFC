"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Copy, EyeOff, ImageOff, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { SinglePhotoUpload, type PhotoKeys } from "@/components/admin/single-photo-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { adminFetch } from "@/lib/admin-fetch"
import { formatPrice } from "@/lib/format"

const GROUP_SIZE = 3

type EventItem = {
  id: string
  group: number
  name: string
  price: number
  description: string
  photoPath: string | null
  thumbPath: string | null
  sold: boolean
  published: boolean
  preview: string | null
}

type FormState = {
  id?: string
  group: number
  name: string
  price: string
  description: string
  photo: PhotoKeys
  sold: boolean
  published: boolean
}

export function EventManager({ items, baseUrl }: { items: EventItem[]; baseUrl: string }) {
  const router = useRouter()
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)

  const groups = useMemo(() => {
    const map = new Map<number, EventItem[]>()
    for (const i of items) map.set(i.group, [...(map.get(i.group) ?? []), i])
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [items])

  const nextGroup = Math.max(0, ...items.map((i) => i.group)) + 1
  const firstWithRoom = groups.find(([, list]) => list.length < GROUP_SIZE)?.[0] ?? nextGroup

  function newItem(group = firstWithRoom) {
    setForm({ group, name: "", price: "", description: "", photo: { photoPath: null, thumbPath: null, preview: null }, sold: false, published: true })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function edit(i: EventItem) {
    setForm({
      id: i.id,
      group: i.group,
      name: i.name,
      price: String(i.price),
      description: i.description,
      photo: { photoPath: i.photoPath, thumbPath: i.thumbPath, preview: i.preview },
      sold: i.sold,
      published: i.published,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true)
    try {
      await fn()
      toast.success(ok)
      router.refresh()
      return true
    } catch (e) {
      toast.error((e as Error).message)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    const price = Number(form.price.replace(/\D/g, ""))
    if (!form.name.trim()) return toast.error("Digite o nome do item")
    if (!price) return toast.error("Digite o preço em reais (só números)")
    const body = {
      group: form.group,
      name: form.name,
      price,
      description: form.description,
      photoPath: form.photo.photoPath,
      thumbPath: form.photo.thumbPath,
      sold: form.sold,
      published: form.published,
    }
    const done = await run(
      () => (form.id ? adminFetch(`/api/admin/event-items/${form.id}`, "PUT", body) : adminFetch("/api/admin/event-items", "POST", body)),
      form.id ? "Item atualizado" : "Item adicionado",
    )
    if (done) setForm(null)
  }

  // Opções de grupo: os que têm vaga (ou o grupo atual do item) + um grupo novo.
  const groupOptions = form
    ? [
        ...groups
          .filter(([n, list]) => list.length < GROUP_SIZE || n === items.find((i) => i.id === form.id)?.group)
          .map(([n, list]) => ({ n, label: `Grupo ${n} (${list.length}/${GROUP_SIZE})` })),
        { n: nextGroup, label: `Grupo ${nextGroup} (novo)` },
      ]
    : []

  return (
    <div className="flex flex-col gap-6">
      {form ? (
        <form onSubmit={save} className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
          <h2 className="font-bold">{form.id ? "Editar item" : "Novo item"}</h2>
          <div className="grid gap-1.5">
            <Label>Foto</Label>
            <SinglePhotoUpload value={form.photo} onChange={(photo) => setForm({ ...form, photo })} onBusy={setUploading} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ev-name">Nome *</Label>
            <Input id="ev-name" value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10" placeholder="Vodka Absolut 1 L" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ev-price">Preço (R$) *</Label>
              <Input
                id="ev-price"
                inputMode="numeric"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                className="h-10"
                placeholder="90"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-group">Grupo do anúncio</Label>
              <select
                id="ev-group"
                value={form.group}
                onChange={(e) => setForm({ ...form, group: Number(e.target.value) })}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                {groupOptions.map((o) => (
                  <option key={o.n} value={o.n}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ev-desc">Descrição curta (opcional)</Label>
            <Textarea id="ev-desc" rows={2} maxLength={120} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Garrafa lacrada." />
            <span className="text-xs text-muted-foreground">{form.description.length}/120</span>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2">
              <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} /> Aparece na página
            </label>
            <label className="flex items-center gap-2">
              <Switch checked={form.sold} onCheckedChange={(v) => setForm({ ...form, sold: v })} /> Vendido
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy || uploading} className="h-10 rounded-full px-5">
              <Check /> {uploading ? "Enviando foto…" : "Salvar"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setForm(null)} className="h-10 rounded-full">
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button onClick={() => newItem()} className="h-11 self-start rounded-full px-5">
          <Plus /> Adicionar item
        </Button>
      )}

      {groups.length === 0 && (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum item ainda. Toque em &quot;Adicionar item&quot; para começar.
        </p>
      )}

      {groups.map(([n, list]) => {
        const link = `${baseUrl}/grupo-${n}`
        return (
          <section key={n} className="overflow-hidden rounded-2xl border bg-card">
            <header className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-4 py-3">
              <h2 className="font-bold">Grupo {n}</h2>
              <span className="text-xs text-muted-foreground">
                {list.length}/{GROUP_SIZE}
              </span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Link do grupo copiado"))}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold hover:bg-muted"
              >
                <Copy className="size-3.5" aria-hidden /> Copiar link do anúncio
              </button>
              {list.length < GROUP_SIZE && (
                <button type="button" onClick={() => newItem(n)} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-primary hover:bg-terracotta-soft">
                  <Plus className="size-3.5" aria-hidden /> Item neste grupo
                </button>
              )}
            </header>
            <p className="truncate px-4 pt-2 text-xs text-muted-foreground">{link}</p>
            <ul className="divide-y">
              {list.map((i) => (
                <li key={i.id} className="flex items-center gap-3 p-3">
                  <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {i.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element -- miniatura do bucket
                      <img src={i.preview} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageOff className="size-5 text-muted-foreground" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{i.name}</p>
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      {formatPrice(i.price)}
                      {i.sold && <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">VENDIDO</span>}
                      {!i.published && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          <EyeOff className="size-3" aria-hidden /> OCULTO
                        </span>
                      )}
                    </p>
                  </div>
                  <label className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground">
                    <Switch
                      checked={i.sold}
                      disabled={busy}
                      onCheckedChange={(v) => run(() => adminFetch(`/api/admin/event-items/${i.id}`, "PATCH", { sold: v }), v ? "Marcado como vendido" : "Disponível de novo")}
                    />
                    Vendido
                  </label>
                  <button onClick={() => edit(i)} className="rounded-full p-2 hover:bg-muted" aria-label={`Editar ${i.name}`}>
                    <Pencil className="size-4" />
                  </button>
                  <ConfirmDialog
                    title={`Excluir "${i.name}"?`}
                    description="O item e a foto saem da página. Isso não pode ser desfeito."
                    onConfirm={() => run(() => adminFetch(`/api/admin/event-items/${i.id}`, "DELETE"), "Item excluído")}
                  >
                    {(open) => (
                      <button onClick={open} className="rounded-full p-2 text-destructive hover:bg-destructive/10" aria-label={`Excluir ${i.name}`}>
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </ConfirmDialog>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
