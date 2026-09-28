import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { PackageSearch } from "lucide-react"
import { ItemCard, ItemGrid } from "@/components/item-card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getCatalog, getCategoriesWithCounts } from "@/lib/queries"
import { FilterBar } from "./filter-bar"

export const revalidate = 30

export const metadata: Metadata = {
  title: "Catálogo",
  openGraph: { title: "Catálogo — Garagem do Fabio" },
}

function str(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v)?.trim() || undefined
}

export default async function CatalogPage(props: PageProps<"/itens">) {
  const sp = await props.searchParams
  const filters = {
    q: str(sp.q)?.slice(0, 100),
    cat: str(sp.cat),
    preco: str(sp.preco),
    status: str(sp.status),
    page: Number(str(sp.page)) || 1,
  }
  const [categories, { items, total, page, totalPages }] = await Promise.all([
    getCategoriesWithCounts(),
    getCatalog(filters),
  ])
  const currentCat = categories.find((c) => c.slug === filters.cat)

  function pageHref(p: number) {
    const next = new URLSearchParams()
    for (const [k, v] of Object.entries(filters)) if (v && k !== "page") next.set(k, String(v))
    if (p > 1) next.set("page", String(p))
    const qs = next.toString()
    return qs ? `/itens?${qs}` : "/itens"
  }

  return (
    <div className="flex flex-col gap-5 py-6">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{currentCat?.name ?? "Todos os itens"}</h1>
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? "item encontrado" : "itens encontrados"}
        </p>
      </div>

      <Suspense>
        <FilterBar categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />
      </Suspense>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed bg-card px-6 py-16 text-center">
          <PackageSearch className="size-10 text-muted-foreground" aria-hidden />
          <p className="font-semibold">Nenhum item encontrado</p>
          <p className="text-sm text-muted-foreground">Tente outra busca ou remova alguns filtros.</p>
          <Link href="/itens" className={cn(buttonVariants(), "mt-2 h-10 rounded-full px-5")}>
            Limpar filtros
          </Link>
        </div>
      ) : (
        <ItemGrid>
          {items.map((item, i) => (
            <ItemCard key={item.id} item={item} priority={i < 4} />
          ))}
        </ItemGrid>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2 pt-4" aria-label="Paginação">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-full px-4")}>
              ← Anterior
            </Link>
          )}
          <span className="px-3 text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <Link href={pageHref(page + 1)} className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-full px-4")}>
              Próxima →
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}
