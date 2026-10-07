"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Copy, Eye, EyeOff, ExternalLink, ImageOff, Pencil, Star, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { cn } from "@/lib/utils"
import { adminFetch } from "@/lib/admin-fetch"
import { formatPrice, STATUS_LABEL, STATUSES, type ItemStatus } from "@/lib/format"

type Row = {
  id: string
  slug: string
  title: string
  price: number
  status: string
  category: string | null
  thumb: string | null
  featured: boolean
  published: boolean
  photoCount: number
  pickup: string | null
}

const statusBtn: Record<ItemStatus, string> = {
  disponivel: "data-[on=true]:bg-olive data-[on=true]:text-olive-foreground",
  reservado: "data-[on=true]:bg-amber data-[on=true]:text-[#3D2A06]",
  vendido: "data-[on=true]:bg-foreground data-[on=true]:text-background",
}

export function ItemsTable({ rows }: { rows: Row[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<"" | ItemStatus | "rascunho">("")
  const [busy, setBusy] = useState<string | null>(null)
  const matches = (r: Row, f: typeof filter) => (f === "rascunho" ? !r.published : f ? r.status === f : true)
  const visible = rows.filter((r) => matches(r, filter))

  async function setStatus(id: string, status: ItemStatus) {
    setBusy(id)
    try {
      await adminFetch(`/api/admin/items/${id}`, "PUT", { status })
      toast.success(`Marcado como ${STATUS_LABEL[status].toLowerCase()}`)
      router.refresh()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(null)
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

      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {visible.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhum item aqui.</li>}
        {visible.map((r) => (
          <li
            key={r.id}
            className={cn("flex flex-col gap-3 p-3 sm:flex-row sm:items-center", busy === r.id && "opacity-50")}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
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
                  <span className={r.photoCount === 0 ? "font-semibold text-destructive" : ""}>
                    · {r.photoCount} {r.photoCount === 1 ? "foto" : "fotos"}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
              <div className="ml-auto flex">
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
    </div>
  )
}
