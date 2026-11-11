import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { eventoInfo, getGrupos, isGroupSlug } from "@/lib/so-no-evento"
import { EventView } from "../event-view"

export const dynamic = "force-dynamic"

async function findGroup(slug: string) {
  // Formato conferido antes de qualquer consulta; grupo vazio ou inexistente vira 404.
  if (!isGroupSlug(slug)) return null
  const grupos = await getGrupos()
  const g = grupos.find((x) => x.id === slug)
  return g ? { g, grupos } : null
}

export async function generateMetadata(props: PageProps<"/so-no-evento/[grupo]">): Promise<Metadata> {
  const found = await findGroup((await props.params).grupo)
  return {
    title: found ? found.g.itens.map((i) => i.nome).join(", ") : "Grupo não encontrado",
    description: `Só no evento de ${eventoInfo.evento.data.slice(0, 5)}.`,
    robots: { index: false, follow: false, nocache: true },
    alternates: { canonical: "/so-no-evento" },
  }
}

/** Link de anúncio: o grupo pedido aparece primeiro; os demais vêm logo abaixo. */
export default async function GrupoPage(props: PageProps<"/so-no-evento/[grupo]">) {
  const found = await findGroup((await props.params).grupo)
  if (!found) notFound()
  const { g, grupos } = found
  return <EventView grupos={[g, ...grupos.filter((x) => x.id !== g.id)]} destaque={g.id} />
}
