import "server-only"
import { cache } from "react"
import { z } from "zod"
import raw from "@/content/so-no-evento.json"
import { publicDb as db } from "./db"
import { getFileUrl } from "./file-url"

/**
 * Página /so-no-evento (só por link de anúncio).
 *  - Data, local e contatos: content/so-no-evento.json (validado; formato errado = build falha).
 *  - Itens: tabela EventItem, editada no painel (/admin/evento). O visitante usa o papel
 *    garagem_public, que pela RLS só enxerga itens publicados.
 */
const infoSchema = z
  .object({
    evento: z.object({ data: z.string().min(1), horario: z.string().min(1), local: z.string().min(1) }).strict(),
    contato: z
      .object({
        whatsapp: z.string().regex(/^55\d{10,11}$/),
        whatsappExibicao: z.string().min(1),
        instagram: z.string().regex(/^[a-z0-9._]{1,30}$/),
      })
      .strict(),
  })
  .strict()

export const eventoInfo = infoSchema.parse(raw)

export type EventoItem = { id: string; nome: string; preco: number; descricao: string; foto: string | null; vendido: boolean }
export type EventoGrupo = { id: string; itens: EventoItem[] }

/** Itens publicados, agrupados por número de grupo (só os campos que a página mostra). */
export const getGrupos = cache(async (): Promise<EventoGrupo[]> => {
  const rows = await db.eventItem.findMany({
    where: { published: true },
    orderBy: [{ group: "asc" }, { createdAt: "asc" }],
    select: { id: true, group: true, name: true, price: true, description: true, photoPath: true, thumbPath: true, sold: true },
  })
  const map = new Map<number, EventoItem[]>()
  for (const r of rows) {
    const list = map.get(r.group) ?? []
    list.push({
      id: r.id,
      nome: r.name,
      preco: r.price,
      descricao: r.description,
      foto: getFileUrl(r.photoPath) ?? getFileUrl(r.thumbPath),
      vendido: r.sold,
    })
    map.set(r.group, list)
  }
  return [...map.entries()].map(([n, itens]) => ({ id: `grupo-${n}`, itens }))
})

/** Só "grupo-N" (N de 1 a 99) que exista; qualquer outra coisa na URL vira 404. */
export function isGroupSlug(value: string) {
  return /^grupo-[1-9]\d?$/.test(value)
}
