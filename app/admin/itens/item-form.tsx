"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { PhotoUploader, type UploadedPhoto } from "@/components/admin/photo-uploader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { adminFetch } from "@/lib/admin-fetch"
import { STATUS_LABEL, STATUSES } from "@/lib/format"

export type ItemFormValues = {
  id?: string
  title: string
  description: string
  price: number | ""
  originalPrice: number | ""
  referenceUrl: string
  condition: string
  status: string
  acceptsOffers: boolean
  featured: boolean
  categoryId: string
  photos: { id: string; cloud_storage_path: string | null; thumbnailPath: string | null; preview: string }[]
}

const selectCls =
  "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"

export function ItemForm({
  initial,
  categories,
  conditions: conditionOptions,
}: {
  initial: ItemFormValues
  categories: { id: string; name: string }[]
  conditions: string[]
}) {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [photos, setPhotos] = useState<UploadedPhoto[]>(() =>
    initial.photos.map((p) => ({
      id: p.id,
      localId: p.id,
      cloud_storage_path: p.cloud_storage_path ?? undefined,
      thumbnailPath: p.thumbnailPath,
      preview: p.preview,
      state: "done",
      progress: 1,
    })),
  )
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof ItemFormValues>(k: K, v: ItemFormValues[K]) => setValues((prev) => ({ ...prev, [k]: v }))

  const uploading = photos.some((p) => p.state === "compressing" || p.state === "uploading")
  const conditions = conditionOptions.includes(values.condition) ? conditionOptions : [values.condition, ...conditionOptions]

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.title.trim()) return toast.error("Informe o título")
    if (values.price === "" || Number(values.price) < 0) return toast.error("Informe o preço")
    setSaving(true)
    try {
      // Campos explícitos: o servidor rejeita qualquer campo a mais (schema estrito)
      const body = {
        title: values.title,
        description: values.description,
        condition: values.condition,
        status: values.status,
        acceptsOffers: values.acceptsOffers,
        featured: values.featured,
        referenceUrl: values.referenceUrl.trim(),
        price: Number(values.price),
        originalPrice: values.originalPrice === "" ? null : Number(values.originalPrice),
        categoryId: values.categoryId || null,
        photos: photos
          .filter((p) => p.state === "done" && p.cloud_storage_path)
          .map((p) => ({ id: p.id, cloud_storage_path: p.cloud_storage_path!, thumbnailPath: p.thumbnailPath ?? null })),
      }
      if (values.id) await adminFetch(`/api/admin/items/${values.id}`, "PUT", body)
      else await adminFetch("/api/admin/items", "POST", body)
      toast.success(values.id ? "Item atualizado" : "Item cadastrado")
      router.push("/admin/itens")
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-5">
        <h2 className="font-bold">Fotos</h2>
        <PhotoUploader photos={photos} onChange={setPhotos} />
      </section>

      <section className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-2 sm:p-5">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="title">Título *</Label>
          <Input id="title" required maxLength={120} value={values.title} onChange={(e) => set("title", e.target.value)} className="h-10" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="price">Preço (R$) *</Label>
          <Input
            id="price"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            required
            value={values.price}
            onChange={(e) => set("price", e.target.value === "" ? "" : Number(e.target.value))}
            className="h-10"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="originalPrice">Preço original (opcional, aparece riscado)</Label>
          <Input
            id="originalPrice"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={values.originalPrice}
            onChange={(e) => set("originalPrice", e.target.value === "" ? "" : Number(e.target.value))}
            className="h-10"
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="referenceUrl">Link do produto novo (opcional)</Label>
          <Input
            id="referenceUrl"
            type="url"
            inputMode="url"
            maxLength={500}
            placeholder="https://www.loja.com.br/produto…"
            value={values.referenceUrl}
            onChange={(e) => set("referenceUrl", e.target.value)}
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">
            Página do mesmo produto novo numa loja, para o comprador comparar o preço. Só links https://.
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="condition">Condição</Label>
          <select id="condition" value={values.condition} onChange={(e) => set("condition", e.target.value)} className={selectCls}>
            {conditions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="category">Categoria</Label>
          <select id="category" value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)} className={selectCls}>
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="status">Status</Label>
          <select id="status" value={values.status} onChange={(e) => set("status", e.target.value)} className={selectCls}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            rows={5}
            maxLength={5000}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Medidas, marca, tempo de uso, defeitos…"
          />
        </div>
        <label className="flex items-center justify-between gap-3 rounded-xl border p-3">
          <span>
            <span className="block text-sm font-semibold">Aceito ofertas</span>
            <span className="text-xs text-muted-foreground">Mostra o selo verde no anúncio</span>
          </span>
          <Switch checked={values.acceptsOffers} onCheckedChange={(v) => set("acceptsOffers", v)} />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-xl border p-3">
          <span>
            <span className="block text-sm font-semibold">Destaque</span>
            <span className="text-xs text-muted-foreground">Aparece na página inicial</span>
          </span>
          <Switch checked={values.featured} onCheckedChange={(v) => set("featured", v)} />
        </label>
      </section>

      <div className="sticky bottom-20 z-20 flex justify-end gap-2 md:bottom-4">
        <Button type="button" variant="outline" className="h-11 rounded-full bg-card px-5" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || uploading} className="h-11 rounded-full px-6 text-base font-semibold shadow-lg">
          {(saving || uploading) && <Loader2 className="animate-spin" />}
          {uploading ? "Enviando fotos…" : values.id ? "Salvar alterações" : "Cadastrar item"}
        </Button>
      </div>
    </form>
  )
}
