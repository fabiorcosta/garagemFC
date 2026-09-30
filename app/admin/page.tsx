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
  const [counts, unread, latestItems, latestMessages] = await Promise.all([
    getStatusCounts(),
    db.contactMessage.count({ where: { read: false } }),
    db.item.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    db.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { item: { select: { title: true } } },
    }),
  ])
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Metric label="Total de itens" value={total} />
        <Metric label="Disponíveis" value={counts.disponivel} className="bg-olive-soft text-olive" />
        <Metric label="Reservados" value={counts.reservado} className="bg-amber-soft text-[#8A5A0B]" />
        <Metric label="Vendidos" value={counts.vendido} className="bg-terracotta-soft text-primary" />
        <Metric label="Mensagens novas" value={unread} href="/admin/mensagens" className="col-span-2 sm:col-span-1" />
      </div>

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
