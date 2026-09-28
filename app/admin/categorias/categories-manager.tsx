"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Pencil, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { adminFetch } from "@/lib/admin-fetch"
import { slugify } from "@/lib/format"

type Cat = { id: string; name: string; slug: string; sortOrder: number; count: number }

export function CategoriesManager({ categories }: { categories: Cat[] }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [editing, setEditing] = useState<{ id: string; name: string; sortOrder: number } | null>(null)
  const [busy, setBusy] = useState(false)

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

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const nextOrder = Math.max(-1, ...categories.map((c) => c.sortOrder)) + 1
          const done = await run(
            () => adminFetch("/api/admin/categories", "POST", { name, sortOrder: nextOrder }),
            "Categoria criada",
          )
          if (done) setName("")
        }}
        className="flex flex-col gap-2 rounded-2xl border bg-card p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="new-cat" className="text-sm font-medium">
            Nova categoria
          </label>
          <Input id="new-cat" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ex: Cozinha" className="mt-1.5 h-10" />
          {name && <p className="mt-1 text-xs text-muted-foreground">Endereço: /itens?cat={slugify(name)}</p>}
        </div>
        <Button type="submit" disabled={busy || !name.trim()} className="h-10 rounded-full px-4">
          <Plus /> Adicionar
        </Button>
      </form>

      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {categories.map((c) =>
          editing?.id === c.id ? (
            <li key={c.id} className="flex flex-wrap items-center gap-2 p-3">
              <Input
                autoFocus
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="h-9 min-w-40 flex-1"
                aria-label="Nome"
              />
              <Input
                type="number"
                min={0}
                value={editing.sortOrder}
                onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
                className="h-9 w-20"
                aria-label="Ordem"
              />
              <Button
                size="icon"
                disabled={busy}
                aria-label="Salvar"
                onClick={async () => {
                  const done = await run(
                    () => adminFetch(`/api/admin/categories/${c.id}`, "PUT", { name: editing.name, sortOrder: editing.sortOrder }),
                    "Categoria atualizada",
                  )
                  if (done) setEditing(null)
                }}
              >
                <Check />
              </Button>
              <Button size="icon" variant="ghost" aria-label="Cancelar" onClick={() => setEditing(null)}>
                <X />
              </Button>
            </li>
          ) : (
            <li key={c.id} className="flex items-center gap-3 p-3">
              <span className="w-8 text-center text-xs text-muted-foreground" title="Ordem">
                {c.sortOrder}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.slug} · {c.count} {c.count === 1 ? "item" : "itens"}
                </p>
              </div>
              <button
                onClick={() => setEditing({ id: c.id, name: c.name, sortOrder: c.sortOrder })}
                className="rounded-full p-2 hover:bg-muted"
                aria-label="Editar"
              >
                <Pencil className="size-4" />
              </button>
              <ConfirmDialog
                title={`Excluir "${c.name}"?`}
                description={
                  c.count > 0
                    ? `Esta categoria tem ${c.count} ${c.count === 1 ? "item" : "itens"}. Eles não serão apagados, mas ficarão sem categoria.`
                    : undefined
                }
                onConfirm={() => run(() => adminFetch(`/api/admin/categories/${c.id}`, "DELETE"), "Categoria excluída")}
              >
                {(open) => (
                  <button onClick={open} className="rounded-full p-2 text-destructive hover:bg-destructive/10" aria-label="Excluir">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </ConfirmDialog>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}
