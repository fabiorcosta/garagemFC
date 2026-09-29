import type { Metadata } from "next"
import { CalendarClock, Info, MapPin, Wallet } from "lucide-react"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { getSettings } from "@/lib/queries"

// Renderizado a cada visita: o banco só é acessível na rede interna do Railway, não durante o build.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Retirada e pagamento",
  description: "Onde retirar os itens, formas de pagamento e regras da venda.",
}

export default async function PickupPage() {
  const s = await getSettings()
  const end = s.saleEndDate?.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  })
  const place = [s.pickupNeighborhood, s.pickupCity].filter(Boolean).join(" · ")

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 py-8">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">Retirada e pagamento</h1>
        <p className="mt-1 text-muted-foreground">Tudo o que você precisa saber antes de buscar seu item.</p>
      </div>

      {end && (
        <div className="flex items-center gap-3 rounded-2xl bg-terracotta-soft p-4 text-sm font-medium text-primary">
          <CalendarClock className="size-5 shrink-0" aria-hidden />
          <p>
            A venda termina em <strong>{end}</strong>. Depois dessa data não será possível retirar itens.
          </p>
        </div>
      )}

      <Section icon={MapPin} title="Onde retirar">
        {place && <p className="font-semibold">{place}</p>}
        <p>O endereço completo é enviado pelo WhatsApp depois que a compra for combinada.</p>
      </Section>

      <Section icon={Wallet} title="Como pagar">
        <p>{s.paymentInfo || "Pix ou dinheiro, combinado pelo WhatsApp."}</p>
      </Section>

      <Section icon={Info} title="Regras">
        <p>{s.pickupInfo || "Retirada com hora marcada. O transporte é por conta do comprador."}</p>
      </Section>

      <WhatsAppButton
        phone={s.whatsapp}
        message="Olá! Quero combinar a retirada de um item da Garagem do Fabio."
        label="Combinar retirada pelo WhatsApp"
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
