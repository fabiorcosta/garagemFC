import Link from "next/link"
import { Pencil, Plus } from "lucide-react"
import { StatusBadge } from "@/components/item-badges"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { adminPageContext } from "@/lib/admin-auth"
import { formatPrice } from "@/lib/format"
import { getStatusCounts } from "@/lib/queries"

export default async function DashboardPage() {
  const { db } = await adminPageContext()
  const [counts, drafts, unread, latestItems, latestMessages, sales, categories, allItems] = await Promise.all([
    getStatusCounts(), // contagem pública: só itens publicados
    db.item.count({ where: { published: false } }),
    db.contactMessage.count({ where: { read: false } }),
    db.item.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    db.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { item: { select: { title: true } } },
    }),
    db.sale.findMany({
      where: { item: { status: { in: ["vendido", "reservado"] } } },
      select: { finalPrice: true, paidPercent: true, item: { select: { price: true } } },
    }),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.item.findMany({ select: { categoryId: true, status: true, price: true, published: true, sale: { select: { finalPrice: true } } } }),
  ])
  // Resumo por categoria (inclui rascunhos na contagem total; valores só de itens publicados)
  type CatRow = { id: string; name: string; total: number; disponivel: number; vendido: number; aVenda: number; vendidoValor: number }
  const byCat = new Map<string, CatRow>()
  for (const c of [...categories, { id: "none", name: "Sem categoria" }]) {
    byCat.set(c.id, { id: c.id, name: c.name, total: 0, disponivel: 0, vendido: 0, aVenda: 0, vendidoValor: 0 })
  }
  for (const i of allItems) {
    const row = byCat.get(i.categoryId ?? "none")
    if (!row) continue
    row.total++
    if (!i.published) continue
    if (i.status === "disponivel") {
      row.disponivel++
      row.aVenda += i.price
    } else if (i.status === "vendido") {
      row.vendido++
      row.vendidoValor += i.sale?.finalPrice ?? i.price
    }
  }
  const catRows = [...byCat.values()].filter((r) => r.total > 0 || r.id !== "none")
  // Valor de cada venda = valor combinado (ou o preço do anúncio, se não informado)
  const saleValue = (s: (typeof sales)[number]) => s.finalPrice ?? s.item.price
  const received = sales.reduce((sum, s) => sum + (saleValue(s) * s.paidPercent) / 100, 0)
  const pending = sales.reduce((sum, s) => sum + (saleValue(s) * (100 - s.paidPercent)) / 100, 0)
  const total = counts.disponivel + counts.reservado + counts.vendido

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold">Dashboard</h1>
        <Link href="/admin/itens/novo" className={cn(buttonVariants(), "h-10 rounded-full px-4")}>
          <Plus />
          Novo item
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <Metric label="Publicados" value={total} />
        <Metric label="Rascunhos" value={drafts} href="/admin/itens" className="bg-amber-soft text-[#8A5A0B]" />
        <Metric label="Disponíveis" value={counts.disponivel} className="bg-olive-soft text-olive" />
        <Metric label="Reservados" value={counts.reservado} className="bg-amber-soft text-[#8A5A0B]" />
        <Metric label="Vendidos" value={counts.vendido} className="bg-terracotta-soft text-primary" />
        <Metric label="Mensagens novas" value={unread} href="/admin/mensagens" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-2xl border bg-olive-soft p-4 text-olive">
          <span className="text-2xl font-extrabold sm:text-3xl">{formatPrice(received)}</span>
          <span className="text-xs font-semibold">Já recebido</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border bg-terracotta-soft p-4 text-primary">
          <span className="text-2xl font-extrabold sm:text-3xl">{formatPrice(pending)}</span>
          <span className="text-xs font-semibold">A receber (vendidos e reservados)</span>
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="mb-2 font-bold">Por categoria</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 font-semibold">Categoria</th>
                <th className="py-2 text-right font-semibold">Itens</th>
                <th className="py-2 text-right font-semibold">Disponíveis</th>
                <th className="py-2 text-right font-semibold">Vendidos</th>
                <th className="py-2 text-right font-semibold">À venda (R$)</th>
                <th className="py-2 text-right font-semibold">Vendido (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {catRows.map((r) => (
                <tr key={r.id} className={cn(r.id === "none" && r.total > 0 && "text-destructive")}>
                  <td className="py-2">
                    <Link href={`/admin/itens?cat=${r.id}`} className="font-medium hover:text-primary hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td className="py-2 text-right">{r.total}</td>
                  <td className="py-2 text-right">{r.disponivel}</td>
                  <td className="py-2 text-right">{r.vendido}</td>
                  <td className="py-2 text-right">{formatPrice(r.aVenda)}</td>
                  <td className="py-2 text-right">{formatPrice(r.vendidoValor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Últimos itens" href="/admin/itens">
          {latestItems.map((i) => (
            <li key={i.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{i.title}</p>
                <p className="text-xs text-muted-foreground">{formatPrice(i.price)}</p>
              </div>
              <StatusBadge status={i.status} />
              <Link href={`/admin/itens/${i.id}`} className="rounded-full p-2 hover:bg-muted" aria-label="Editar">
                <Pencil className="size-4" />
              </Link>
            </li>
          ))}
        </Panel>
        <Panel title="Últimas mensagens" href="/admin/mensagens">
          {latestMessages.length === 0 && <li className="py-4 text-sm text-muted-foreground">Nenhuma mensagem ainda.</li>}
          {latestMessages.map((m) => (
            <li key={m.id} className="py-2.5">
              <div className="flex items-center gap-2">
                {!m.read && <span className="size-2 rounded-full bg-primary" aria-label="Nova" />}
                <p className="text-sm font-medium">{m.name}</p>
                <span className="ml-auto text-xs text-muted-foreground">
                  {m.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {m.item ? `${m.item.title}: ` : ""}
                {m.message}
              </p>
            </li>
          ))}
        </Panel>
      </div>
    </div>
  )
}

function Metric({ label, value, className, href }: { label: string; value: number; className?: string; href?: string }) {
  const cls = cn("flex flex-col gap-1 rounded-2xl border bg-card p-4", className)
  const body = (
    <>
      <span className="text-3xl font-extrabold">{value}</span>
      <span className="text-xs font-semibold opacity-80">{label}</span>
    </>
  )
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>
}

function Panel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-bold">{title}</h2>
        <Link href={href} className="text-sm font-medium text-primary hover:underline">
          Ver tudo
        </Link>
      </div>
      <ul className="divide-y">{children}</ul>
    </section>
  )
}
