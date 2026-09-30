import type { Metadata } from "next"
import { CalendarClock, Clock, Info, MapPin, Navigation, Wallet } from "lucide-react"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { getSettings } from "@/lib/queries"
import { fill } from "@/lib/site-texts"

// Renderizado a cada visita: o banco só é acessível na rede interna do Railway, não durante o build.
export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  return { title: s.t.pickupTitle, description: s.t.pickupIntro }
}

export default async function PickupPage() {
  const s = await getSettings()
  const t = s.t
  const end = s.saleEndDate?.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  })
  const place = [s.pickupNeighborhood, s.pickupCity].filter(Boolean).join(" · ")
  const mapUrl = /^https:\/\//.test(t.pickupMapUrl) ? t.pickupMapUrl : null

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 py-8">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t.pickupTitle}</h1>
        <p className="mt-1 text-muted-foreground">{t.pickupIntro}</p>
      </div>

      {end && (
        <div className="flex items-center gap-3 rounded-2xl bg-terracotta-soft p-4 text-sm font-medium text-primary">
          <CalendarClock className="size-5 shrink-0" aria-hidden />
          <p>{fill(t.pickupDeadline, { data: end })}</p>
        </div>
      )}

      <Section icon={MapPin} title={t.pickupWhereTitle}>
        {t.pickupAddress && <p className="font-semibold">{t.pickupAddress}</p>}
        {place && <p className={t.pickupAddress ? "" : "font-semibold"}>{place}</p>}
        {!t.pickupAddress && <p>{t.pickupAddressNote}</p>}
        {mapUrl && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold hover:bg-muted"
          >
            <Navigation className="size-4" aria-hidden /> Abrir no mapa
          </a>
        )}
      </Section>

      {t.pickupHours && (
        <Section icon={Clock} title="Horários">
          <p>{t.pickupHours}</p>
        </Section>
      )}

      <Section icon={Wallet} title={t.pickupPayTitle}>
        <p>{s.paymentInfo || "Pix ou dinheiro, combinado pelo WhatsApp."}</p>
      </Section>

      <Section icon={Info} title={t.pickupRulesTitle}>
        <p>{s.pickupInfo || "Retirada com hora marcada. O transporte é por conta do comprador."}</p>
      </Section>

      <WhatsAppButton
        phone={s.whatsapp}
        message={t.whatsappPickupMessage}
        label={t.pickupButton}
        className="h-12 self-start text-base"
      />
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex gap-4 rounded-2xl border bg-card p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-olive-soft text-olive">
        <Icon className="size-5" />
      </span>
      <div className="flex flex-col gap-1 text-[15px] leading-relaxed whitespace-pre-line">
        <h2 className="text-base font-bold">{title}</h2>
        {children}
      </div>
    </section>
  )
}
