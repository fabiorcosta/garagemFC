import type { Metadata } from "next"
import { getEvento, getGrupos } from "@/lib/so-no-evento"
import { EventView } from "./event-view"

// Mesmo motivo das outras páginas: a CSP usa um nonce novo por visita (ver proxy.ts).
export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const e = await getEvento()
  return {
    title: `Só no Evento${e.dia ? ` — ${e.dia}` : ""}`,
    description: "Itens disponíveis apenas no dia do evento presencial.",
    // Página só por link (anúncios): fora de buscadores.
    robots: { index: false, follow: false, nocache: true },
  }
}

export default async function SoNoEventoPage() {
  const [grupos, evento] = await Promise.all([getGrupos(), getEvento()])
  return <EventView grupos={grupos} evento={evento} />
}
