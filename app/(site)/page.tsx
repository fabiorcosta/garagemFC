import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, CalendarClock } from "lucide-react"
import { ItemCard, ItemGrid } from "@/components/item-card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { daysUntil } from "@/lib/format"
import { getCategoriesWithCounts, getFeaturedItems, getSettings, getStatusCounts } from "@/lib/queries"

export const revalidate = 30

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  return {
    title: { absolute: s.siteTitle },
    description: s.heroSubtitle,
    openGraph: { title: s.heroTitle, description: s.heroSubtitle },
  }
}

export default async function HomePage() {
  const [settings, counts, featured, categories] = await Promise.all([
    getSettings(),
    getStatusCounts(),
    getFeaturedItems(),
    getCategoriesWithCounts(),
  ])
  const days = daysUntil(settings.saleEndDate)
  const endLabel = settings.saleEndDate?.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  })

  return (
    <div className="flex flex-col gap-12 py-6 sm:py-10">
      <section className="fade-in relative overflow-hidden rounded-3xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 sm:py-14">
        <div className="relative z-10 flex max-w-2xl flex-col gap-4">
          {days !== null && (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <CalendarClock className="size-4" aria-hidden />
              {days === 0 ? "Último dia!" : `Faltam ${days} ${days === 1 ? "dia" : "dias"}`}
              {endLabel && ` · até ${endLabel}`}
            </span>
          )}
          <h1 className="text-3xl leading-tight font-extrabold text-balance sm:text-5xl">{settings.heroTitle}</h1>
          {settings.heroSubtitle && <p className="text-base text-white/90 sm:text-lg">{settings.heroSubtitle}</p>}
          <Link
            href="/itens"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-2 h-12 w-fit rounded-full bg-white px-6 text-base font-bold text-primary hover:bg-white/90",
            )}
          >
            Ver todos os itens
            <ArrowRight className="size-5" aria-hidden />
          </Link>
        </div>
        <div aria-hidden className="absolute -right-16 -bottom-24 size-72 rounded-full bg-white/10" />
        <div aria-hidden className="absolute -top-10 right-24 size-32 rounded-full bg-white/10" />
      </section>

      <section className="fade-in grid grid-cols-3 gap-3" aria-label="Resumo">
        <Stat value={counts.disponivel} label="Disponíveis" className="bg-olive-soft text-olive" href="/itens?status=disponivel" />
        <Stat value={counts.reservado} label="Reservados" className="bg-amber-soft text-[#8A5A0B]" />
        <Stat value={counts.vendido} label="Vendidos" className="bg-terracotta-soft text-primary" />
      </section>

      {featured.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionTitle title="Destaques" href="/itens" />
          <ItemGrid>
            {featured.map((item, i) => (
              <div key={item.id} className="fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <ItemCard item={item} priority={i < 2} />
              </div>
            ))}
          </ItemGrid>
        </section>
      )}

      {categories.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionTitle title="Categorias" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/itens?cat=${c.slug}`}
                className="flex items-center justify-between rounded-2xl border bg-card px-4 py-4 font-semibold transition hover:border-primary hover:text-primary"
              >
                <span className="text-sm">{c.name}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{c._count.items}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Stat({ value, label, className, href }: { value: number; label: string; className: string; href?: string }) {
  const content = (
    <>
      <span className="text-2xl font-extrabold sm:text-3xl">{value}</span>
      <span className="text-xs font-semibold sm:text-sm">{label}</span>
    </>
  )
  const cls = cn("flex flex-col items-center rounded-2xl py-4", className)
  return href ? (
    <Link href={href} className={cls}>
      {content}
    </Link>
  ) : (
    <div className={cls}>{content}</div>
  )
}

function SectionTitle({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-end justify-between">
      <h2 className="text-xl font-extrabold sm:text-2xl">{title}</h2>
      {href && (
        <Link href={href} className="text-sm font-semibold text-primary hover:underline">
          Ver tudo →
        </Link>
      )}
    </div>
  )
}
