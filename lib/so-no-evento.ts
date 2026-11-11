import "server-only"
import { cache } from "react"
import { z } from "zod"
import raw from "@/content/so-no-evento.json"
import { publicDb as db } from "./db"
import { getFileUrl } from "./file-url"

/**
 * Página /so-no-evento (só por link de anúncio).
 *  - Contatos: content/so-no-evento.json (validado; formato errado = build falha).
 *  - Data, horário, local e instruções: SiteSettings, editados no painel (/admin/evento).
 *  - Itens: tabela EventItem, editada no painel. O visitante usa o papel garagem_public,
 *    que pela RLS só enxerga itens publicados.
 */
const infoSchema = z
  .object({
    contato: z
      .object({
        whatsapp: z.string().regex(/^55\d{10,11}$/),
        whatsappExibicao: z.string().min(1),
        instagram: z.string().regex(/^[a-z0-9._]{1,30}$/),
      })
      .strict(),
  })
  .strict()

export const contato = infoSchema.parse(raw).contato

/** "12:00" → "12h"; "12:30" → "12h30" */
function hora(v: string) {
  const [h, m] = v.split(":")
  return `${Number(h)}h${m === "00" ? "" : m}`
}

export type EventoDados = {
  /** "28/11/2026" ou null */
  data: string | null
  /** "28/11" ou null */
  dia: string | null
  /** "12h às 15h", "a partir das 12h" ou null */
  horario: string | null
  local: string | null
  instrucoes: string | null
}

/** Dados do evento como a página (e qualquer peça de divulgação) deve exibir. */
export const getEvento = cache(async (): Promise<EventoDados> => {
  const s = await db.siteSettings.findUnique({
    where: { id: "main" },
    select: { eventDate: true, eventStart: true, eventEnd: true, eventPlace: true, eventInstructions: true },
  })
  const [y, m, d] = (s?.eventDate ?? "").split("-")
  const start = s?.eventStart ? hora(s.eventStart) : null
  const end = s?.eventEnd ? hora(s.eventEnd) : null
  return {
    data: y ? `${d}/${m}/${y}` : null,
    dia: y ? `${d}/${m}` : null,
    horario: start && end ? `${start} às ${end}` : start ? `a partir das ${start}` : end ? `até ${end}` : null,
    local: s?.eventPlace || null,
    instrucoes: s?.eventInstructions || null,
  }
})

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
