"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Loader2, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { PRICE_RANGES } from "@/lib/format"
import { track } from "@/lib/gtag"

type Category = { slug: string; name: string }

export function FilterBar({ categories, placeholder }: { categories: Category[]; placeholder: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const cat = params.get("cat") ?? ""
  const preco = params.get("preco") ?? ""
  const status = params.get("status") ?? ""

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    next.delete("page")
    if (changes.cat) {
      const name = categories.find((c) => c.slug === changes.cat)?.name
      track("view_category", { category: name ?? changes.cat })
    }
    startTransition(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }))
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          update({ q: String(new FormData(e.currentTarget).get("q") ?? "").trim() })
        }}
        className="relative"
      >
        <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          name="q"
          key={params.get("q") ?? ""}
          defaultValue={params.get("q") ?? ""}
          placeholder={placeholder}
          aria-label="Buscar itens"
          className="h-12 w-full rounded-full border bg-card pr-12 pl-10 text-base outline-none focus:border-primary focus:ring-3 focus:ring-primary/20"
        />
        {pending && (
          <Loader2 className="absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </form>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <Chip active={!cat} onClick={() => update({ cat: "" })}>
          Todas
        </Chip>
        {categories.map((c) => (
          <Chip key={c.slug} active={cat === c.slug} onClick={() => update({ cat: cat === c.slug ? "" : c.slug })}>
            {c.name}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={preco}
          onChange={(e) => update({ preco: e.target.value })}
          aria-label="Faixa de preço"
          className="h-9 rounded-full border bg-card px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">Qualquer preço</option>
          {PRICE_RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <label className="flex h-9 cursor-pointer items-center gap-2 rounded-full border bg-card px-3 text-sm">
          <input
            type="checkbox"
            checked={status === "disponivel"}
            onChange={(e) => update({ status: e.target.checked ? "disponivel" : "" })}
            className="size-4 accent-[var(--olive)]"
          />
          Só disponíveis
        </label>
        {(cat || preco || status || params.get("q")) && (
          <button
            type="button"
            onClick={() => startTransition(() => router.push(pathname, { scroll: false }))}
            className="flex h-9 items-center gap-1 rounded-full px-3 text-sm font-medium text-primary hover:bg-terracotta-soft"
          >
            <X className="size-4" aria-hidden />
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 shrink-0 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50",
      )}
    >
      {children}
    </button>
  )
}
