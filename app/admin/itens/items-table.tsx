"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Copy, Eye, EyeOff, ExternalLink, FolderTree, ImageOff, Pencil, Receipt, Star, Trash2, X } from "lucide-react"
import { SaleDialog } from "@/components/admin/sale-dialog"
import { PAYMENT_LABEL, paymentStatusLabel, type SaleValues } from "@/lib/sale-shared"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { cn } from "@/lib/utils"
import { adminFetch } from "@/lib/admin-fetch"
import { formatPrice, STATUS_LABEL, STATUSES, type ItemStatus } from "@/lib/format"
import { AD_PRIORITIES, AD_PRIORITY_LABEL, isAdPriority, type AdPriority } from "@/lib/ad-priority"

type Row = {
  id: string
  slug: string
  title: string
  price: number
  status: string
  category: string | null
  categoryId: string | null
  adPriority: string
  thumb: string | null
  featured: boolean
  published: boolean
  photoCount: number
  pickup: string | null
  sale: SaleValues | null
}

const statusBtn: Record<ItemStatus, string> = {
  disponivel: "data-[on=true]:bg-olive data-[on=true]:text-olive-foreground",
  reservado: "data-[on=true]:bg-amber data-[on=true]:text-[#3D2A06]",
  vendido: "data-[on=true]:bg-foreground data-[on=true]:text-background",
}

/** "" = todas; "none" = sem categoria; senão o id da categoria */
type CatFilter = string

export function ItemsTable({
  rows,
  categories,
  initialCategory = "",
  initialPriority = "",
}: {
  rows: Row[]
  categories: { id: string; name: string }[]
  initialCategory?: CatFilter
  initialPriority?: "" | AdPriority
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<"" | ItemStatus | "rascunho">("")
  const [catFilter, setCatFilter] = useState<CatFilter>(initialCategory)
  const [prioFilter, setPrioFilter] = useState<"" | AdPriority>(initialPriority)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [target, setTarget] = useState<string>("")
  const [bulkBusy, setBulkBusy] = useState(false)
  const [targetPriority, setTargetPriority] = useState<"" | AdPriority>("")
  const [busy, setBusy] = useState<string | null>(null)
  // markSold vem da AÇÃO que abriu a janela, não da linha (que pode estar desatualizada logo após mudar o status)
  const [saleFor, setSaleFor] = useState<{ id: string; markSold: boolean } | null>(null)
  const saleRow = rows.find((r) => r.id === saleFor?.id)
  const matches = (r: Row, f: typeof filter) => (f === "rascunho" ? !r.published : f ? r.status === f : true)
  const matchesCat = (r: Row, c: CatFilter) => (c === "none" ? !r.categoryId : c ? r.categoryId === c : true)
  const prioOf = (r: Row): AdPriority => (isAdPriority(r.adPriority) ? r.adPriority : "normal")
  const matchesPrio = (r: Row, p: "" | AdPriority) => !p || prioOf(r) === p
  const visible = rows.filter((r) => matches(r, filter) && matchesCat(r, catFilter) && matchesPrio(r, prioFilter))
  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) visible.forEach((r) => next.delete(r.id))
      else visible.forEach((r) => next.add(r.id))
      return next
    })
  }

  async function applyCategory() {
    if (!target) return toast.error("Escolha a categoria")
    setBulkBusy(true)
    try {
      const res = await adminFetch<{ updated: number }>("/api/admin/items/bulk-category", "POST", {
        ids: [...selected],
        categoryId: target === "none" ? null : target,
      })
      const name = target === "none" ? "Sem categoria" : categories.find((c) => c.id === target)?.name
      toast.success(`${res.updated} ${res.updated === 1 ? "item movido" : "itens movidos"} para ${name}`)
      setSelected(new Set())
      setTarget("")
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBulkBusy(false)
    }
  }

  async function setStatus(id: string, status: ItemStatus) {
    setBusy(id)
    try {
      await adminFetch(`/api/admin/items/${id}`, "PUT", { status })
      toast.success(`Marcado como ${STATUS_LABEL[status].toLowerCase()}`)
      router.refresh()
      // Vendido ou reservado: já abre os dados da venda (comprador, pagamento)
      if (status !== "disponivel") setSaleFor({ id, markSold: false })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function setPriority(id: string, adPriority: AdPriority) {
    setBusy(id)
    try {
      await adminFetch(`/api/admin/items/${id}`, "PUT", { adPriority })
      toast.success(`Prioridade de anúncio: ${AD_PRIORITY_LABEL[adPriority]}`)
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function applyPriority() {
    if (!targetPriority) return toast.error("Escolha a prioridade")
    setBulkBusy(true)
    try {
      const res = await adminFetch<{ updated: number }>("/api/admin/items/bulk-priority", "POST", {
        ids: [...selected],
        adPriority: targetPriority,
      })
      toast.success(`${res.updated} ${res.updated === 1 ? "item" : "itens"} com prioridade ${AD_PRIORITY_LABEL[targetPriority]}`)
      setSelected(new Set())
      setTargetPriority("")
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBulkBusy(false)
    }
  }

  async function setPublished(id: string, published: boolean) {
    setBusy(id)
    try {
      await adminFetch(`/api/admin/items/${id}`, "PUT", { published })
      toast.success(published ? "Publicado: já aparece no site" : "Virou rascunho: saiu do site")
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function duplicate(id: string) {
    setBusy(id)
    try {
      const copy = await adminFetch<{ id: string }>(`/api/admin/items/${id}/duplicate`, "POST")
      toast.success("Cópia criada como rascunho — agora adicione as fotos")
      router.push(`/admin/itens/${copy.id}`)
    } catch (e) {
      toast.error((e as Error).message)
      setBusy(null)
    }
  }

  async function remove(id: string) {
    setBusy(id)
    try {
      await adminFetch(`/api/admin/items/${id}`, "DELETE")
      toast.success("Item excluído")
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 overflow-x-auto">
        {(["", ...STATUSES, "rascunho"] as const).map((s) => (
          <button
            key={s || "all"}
            onClick={() => setFilter(s)}
            className={cn(
              "h-8 shrink-0 rounded-full border px-3 text-xs font-semibold",
              filter === s ? "border-primary bg-primary text-primary-foreground" : "bg-card",
            )}
          >
            {s === "rascunho" ? "Rascunhos" : s ? STATUS_LABEL[s] : "Todos"} ({rows.filter((r) => matches(r, s)).length})
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {[{ id: "", name: "Todas as categorias" }, { id: "none", name: "Sem categoria" }, ...categories].map((c) => (
          <button
            key={c.id || "all"}
            onClick={() => setCatFilter(c.id)}
            className={cn(
              "h-8 shrink-0 rounded-full border px-3 text-xs font-semibold",
              catFilter === c.id ? "border-olive bg-olive text-olive-foreground" : "bg-card",
              c.id === "none" && catFilter !== "none" && rows.some((r) => !r.categoryId) && "border-destructive/50 text-destructive",
            )}
          >
            {c.name} ({rows.filter((r) => matchesCat(r, c.id)).length})
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">Anúncio:</span>
        {(["", "maxima", "alta", "normal", "nao_anunciar"] as const).map((p) => (
          <button
            key={p || "all"}
            onClick={() => setPrioFilter(p)}
            className={cn(
              "h-8 shrink-0 rounded-full border px-3 text-xs font-semibold",
              prioFilter === p ? "border-foreground bg-foreground text-background" : "bg-card",
              prioFilter !== p && p === "maxima" && "border-primary text-primary",
              prioFilter !== p && p === "alta" && "border-amber text-[#8A5A0B]",
              prioFilter !== p && p === "nao_anunciar" && "text-muted-foreground",
            )}
          >
            {p ? AD_PRIORITY_LABEL[p] : "Todas"} ({rows.filter((r) => matchesPrio(r, p)).length})
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 px-1 text-sm">
        <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="size-4 accent-[var(--primary)]" />
        Selecionar os {visible.length} itens da lista
      </label>

      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {visible.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhum item aqui.</li>}
        {visible.map((r) => (
          <li
            key={r.id}
            className={cn("flex flex-col gap-3 p-3 sm:flex-row sm:items-center", busy === r.id && "opacity-50")}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <input
                type="checkbox"
                checked={selected.has(r.id)}
                onChange={() => toggle(r.id)}
                aria-label={`Selecionar ${r.title}`}
                className="size-5 shrink-0 accent-[var(--primary)]"
              />
              <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                {r.thumb ? (
                  <Image src={r.thumb} alt="" fill sizes="56px" className="object-cover" />
                ) : (
                  <ImageOff className="absolute inset-0 m-auto size-5 text-muted-foreground/60" />
                )}
              </div>
              <div className="min-w-0">
                <Link href={`/admin/itens/${r.id}`} className="line-clamp-1 font-semibold hover:text-primary">
                  {r.featured && <Star className="mr-1 inline size-3.5 fill-amber text-amber" aria-label="Destaque" />}
                  {r.title}
                </Link>
                <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                  {!r.published && (
                    <span className="rounded-full bg-amber px-2 py-0.5 text-[10px] font-bold text-[#3D2A06] uppercase">Rascunho</span>
                  )}
                  <span className="font-semibold text-foreground">{formatPrice(r.price)}</span>
                  {r.category && <span>· {r.category}</span>}
                  {r.pickup && <span>· retira a partir de {r.pickup}</span>}
                  {r.status !== "disponivel" && (
                    <button
                      type="button"
                      onClick={() => setSaleFor({ id: r.id, markSold: r.status === "disponivel" })}
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        !r.sale
                          ? "bg-muted text-muted-foreground"
                          : r.sale.paidPercent >= 100
                            ? "bg-olive text-olive-foreground"
                            : "bg-terracotta-soft text-primary",
                      )}
                      title="Dados da venda"
                    >
                      {r.sale
                        ? `${paymentStatusLabel(r.sale.paidPercent)}${r.sale.paymentMethod ? ` · ${PAYMENT_LABEL[r.sale.paymentMethod]}` : ""}${r.sale.buyerName ? ` · ${r.sale.buyerName}` : ""}`
                        : "+ dados da venda"}
                    </button>
                  )}
                  <span className={r.photoCount === 0 ? "font-semibold text-destructive" : ""}>
                    · {r.photoCount} {r.photoCount === 1 ? "foto" : "fotos"}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="flex rounded-full border bg-muted p-0.5" role="group" aria-label="Status">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    data-on={r.status === s}
                    disabled={busy === r.id || r.status === s}
                    onClick={() => setStatus(r.id, s)}
                    className={cn(
                      "h-7 rounded-full px-2.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground disabled:cursor-default",
                      statusBtn[s],
                    )}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
              <select
                aria-label="Prioridade para anúncios"
                title="Prioridade para anúncios (não aparece no site)"
                value={isAdPriority(r.adPriority) ? r.adPriority : "normal"}
                disabled={busy === r.id}
                onChange={(e) => isAdPriority(e.target.value) && setPriority(r.id, e.target.value)}
                className={cn(
                  "h-8 rounded-full border bg-card px-2 text-[11px] font-semibold",
                  r.adPriority === "maxima" && "border-primary text-primary",
                  r.adPriority === "alta" && "border-amber text-[#8A5A0B]",
                  r.adPriority === "nao_anunciar" && "text-muted-foreground line-through",
                )}
              >
                {AD_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    Anúncio: {AD_PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
              <div className="ml-auto flex flex-wrap">
                <button
                  onClick={() => setPublished(r.id, !r.published)}
                  disabled={busy === r.id}
                  className="rounded-full p-2 hover:bg-muted"
                  aria-label={r.published ? "Esconder do site (virar rascunho)" : "Publicar no site"}
                  title={r.published ? "Esconder do site (virar rascunho)" : "Publicar no site"}
                >
                  {r.published ? <Eye className="size-4" /> : <EyeOff className="size-4 text-amber" />}
                </button>
                <button
                  onClick={() => setSaleFor({ id: r.id, markSold: r.status === "disponivel" })}
                  className="rounded-full p-2 hover:bg-muted"
                  aria-label={r.status === "disponivel" ? "Registrar venda" : "Dados da venda"}
                  title={r.status === "disponivel" ? "Registrar venda" : "Dados da venda"}
                >
                  <Receipt className="size-4" />
                </button>
                <button
                  onClick={() => duplicate(r.id)}
                  disabled={busy === r.id}
                  className="rounded-full p-2 hover:bg-muted"
                  aria-label="Duplicar"
                  title="Duplicar (cria um rascunho sem fotos)"
                >
                  <Copy className="size-4" />
                </button>
                {r.published && (
                  <Link href={`/itens/${r.slug}`} target="_blank" className="rounded-full p-2 hover:bg-muted" aria-label="Ver no site">
                    <ExternalLink className="size-4" />
                  </Link>
                )}
                <Link href={`/admin/itens/${r.id}`} className="rounded-full p-2 hover:bg-muted" aria-label="Editar">
                  <Pencil className="size-4" />
                </Link>
                <ConfirmDialog
                  title={`Excluir "${r.title}"?`}
                  description="O item e as fotos serão apagados de vez. Se ele só foi vendido, prefira marcar como Vendido."
                  onConfirm={() => remove(r.id)}
                >
                  {(open) => (
                    <button onClick={open} className="rounded-full p-2 text-destructive hover:bg-destructive/10" aria-label="Excluir">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </ConfirmDialog>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {selected.size > 0 && (
        <div className="sticky bottom-16 z-20 flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3 shadow-lg md:bottom-4">
          <span className="text-sm font-semibold">
            {selected.size} {selected.size === 1 ? "selecionado" : "selecionados"}
          </span>
          <FolderTree className="size-4 text-muted-foreground" aria-hidden />
          <select
            aria-label="Mover para a categoria"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="h-10 min-w-40 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Mover para…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="none">Sem categoria</option>
          </select>
          <button
            type="button"
            onClick={applyCategory}
            disabled={bulkBusy || !target}
            className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {bulkBusy ? "Aplicando…" : "Aplicar"}
          </button>
          <span className="hidden h-6 w-px bg-border sm:block" aria-hidden />
          <select
            aria-label="Prioridade para anúncios"
            value={targetPriority}
            onChange={(e) => setTargetPriority(isAdPriority(e.target.value) ? e.target.value : "")}
            className="h-10 min-w-40 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Prioridade de anúncio…</option>
            {AD_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {AD_PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyPriority}
            disabled={bulkBusy || !targetPriority}
            className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Aplicar
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto rounded-full p-2 hover:bg-muted" aria-label="Limpar seleção">
            <X className="size-4" />
          </button>
        </div>
      )}
      {saleRow && (
        <SaleDialog
          key={saleRow.id}
          itemId={saleRow.id}
          itemTitle={saleRow.title}
          listPrice={saleRow.price}
          initial={saleRow.sale}
          markSold={saleFor?.markSold ?? false}
          onClose={() => setSaleFor(null)}
          onSaved={() => {
            setSaleFor(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
