import Link from "next/link"
import { CalendarDays, Clock, MapPin } from "lucide-react"
import { EventPhoto } from "@/components/event-photo"
import { WhatsAppButton, WhatsAppIcon } from "@/components/whatsapp-button"
import { formatPrice } from "@/lib/format"
import { fotoUrl, soNoEvento, type EventoGrupo } from "@/lib/so-no-evento"

const { evento, contato } = soNoEvento
const dia = evento.data.slice(0, 5)

/** Página pública só por link (anúncios). Não entra no menu, no catálogo nem em buscadores. */
export function EventView({ grupos, destaque }: { grupos: EventoGrupo[]; destaque?: string }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 py-6 sm:py-8">
      <header className="flex flex-col gap-3 rounded-2xl bg-terracotta-soft p-5">
        <div>
          <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">Só no Evento — {dia}</h1>
          <p className="mt-1 text-sm font-medium">Itens disponíveis apenas no dia do evento presencial</p>
        </div>
        <ul className="flex flex-col gap-1.5 text-sm">
          <li className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="font-semibold">{evento.data}</span>
            <Clock className="ml-1 size-4 shrink-0 text-primary" aria-hidden />
            <span className="font-semibold">{evento.horario}</span>
          </li>
          <li className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>{evento.local}</span>
          </li>
        </ul>
      </header>

      {grupos.map((g, i) => (
        <section key={g.id} id={g.id} className="scroll-mt-24" aria-labelledby={`${g.id}-titulo`}>
          {destaque && i === 1 && (
            <p className="mb-4 border-t pt-6 text-sm font-semibold text-muted-foreground">Outros itens só no evento</p>
          )}
          <h2 id={`${g.id}-titulo`} className="sr-only">
            Grupo {g.id.replace("grupo-", "")}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {g.itens.map((item, j) => (
              <article key={item.nome} className="flex overflow-hidden rounded-2xl border bg-card shadow-sm sm:flex-col">
                <div className="relative w-28 shrink-0 self-start sm:w-auto sm:self-auto">
                  <EventPhoto src={fotoUrl(item.foto)} alt={item.nome} priority={i === 0 && j < 2} />
                  {item.vendido && (
                    <div className="absolute inset-0 flex items-center justify-center bg-foreground/45">
                      <span className="-rotate-12 rounded-md border-2 border-white px-3 py-1 text-lg font-black tracking-widest text-white">
                        VENDIDO
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <h3 className="text-sm leading-snug font-semibold">{item.nome}</h3>
                  <p className="text-lg font-extrabold">{formatPrice(item.preco)}</p>
                  {item.descricao && <p className="text-xs text-muted-foreground">{item.descricao}</p>}
                  <p className="inline-flex items-center gap-1 text-[13px] font-bold text-destructive">
                    <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                    Disponível apenas no dia {dia}
                  </p>
                  {!item.vendido && (
                    <WhatsAppButton
                      phone={contato.whatsapp}
                      message={`Olá! Vi no site e tenho interesse em ${item.nome}`}
                      label="Falar no WhatsApp"
                      itemName={item.nome}
                      className="mt-auto h-10 w-full px-3 text-[13px] whitespace-nowrap shadow-none"
                    />
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      <footer className="flex flex-col gap-2 rounded-2xl border p-5 text-sm">
        <a
          href={`https://wa.me/${contato.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 hover:text-primary"
        >
          <WhatsAppIcon className="size-4" /> WhatsApp: {contato.whatsappExibicao}
        </a>
        <a
          href={`https://www.instagram.com/${contato.instagram}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 hover:text-primary"
        >
          <InstagramIcon className="size-4" /> Instagram: @{contato.instagram}
        </a>
        <Link href="/itens" className="underline underline-offset-2 hover:text-primary">
          Catálogo completo: garagem.casapomar.work/itens
        </Link>
      </footer>
    </div>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  )
}
