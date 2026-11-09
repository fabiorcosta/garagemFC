import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getGrupo, soNoEvento } from "@/lib/so-no-evento"
import { EventView } from "../event-view"

export const dynamic = "force-dynamic"

export async function generateMetadata(props: PageProps<"/so-no-evento/[grupo]">): Promise<Metadata> {
  const { grupo } = await props.params
  const g = getGrupo(grupo)
  return {
    title: g ? `Só no Evento — ${g.itens.map((i) => i.nome).join(", ")}` : "Grupo não encontrado",
    robots: { index: false, follow: false, nocache: true },
    alternates: { canonical: "/so-no-evento" },
  }
}

/** Link de anúncio: o grupo pedido aparece primeiro; os demais vêm logo abaixo. */
export default async function GrupoPage(props: PageProps<"/so-no-evento/[grupo]">) {
  const { grupo } = await props.params
  // Só ids que existem no arquivo; qualquer outra coisa na URL vira 404.
  const g = getGrupo(grupo)
  if (!g) notFound()
  return <EventView grupos={[g, ...soNoEvento.grupos.filter((x) => x.id !== g.id)]} destaque={g.id} />
}
