import type { Metadata } from "next"
import { eventoInfo, getGrupos } from "@/lib/so-no-evento"
import { EventView } from "./event-view"

// Mesmo motivo das outras páginas: a CSP usa um nonce novo por visita (ver proxy.ts).
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: `Só no Evento — ${eventoInfo.evento.data.slice(0, 5)}`,
  description: "Itens disponíveis apenas no dia do evento presencial.",
  // Página só por link (anúncios): fora de buscadores.
  robots: { index: false, follow: false, nocache: true },
}

export default async function SoNoEventoPage() {
  return <EventView grupos={await getGrupos()} />
}
