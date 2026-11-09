import "server-only"
import { z } from "zod"
import raw from "@/content/so-no-evento.json"

/**
 * Itens "só no evento": vêm de content/so-no-evento.json (sem banco, sem rota de escrita).
 * O arquivo é validado aqui; se algo estiver fora do formato, o build falha em vez de publicar errado.
 *  - foto: só arquivos locais em /public/so-no-evento/ (nenhum endereço externo entra na página).
 *  - grupos: id fixo e escrito à mão, para o link de um anúncio nunca mudar de grupo
 *    quando um item novo for incluído.
 *  - sem campo de preço antigo/riscado: regra do dono (nada de "de R$ X por R$ Y").
 */
const itemSchema = z
  .object({
    nome: z.string().trim().min(1).max(80),
    preco: z.number().int().positive().max(100_000),
    descricao: z.string().trim().max(120).optional(),
    foto: z
      .string()
      .regex(/^[a-z0-9][a-z0-9._-]{0,80}\.(jpg|jpeg|png|webp)$/i, "foto: só o nome do arquivo em public/so-no-evento/")
      .nullable()
      .optional(),
    vendido: z.boolean().optional(),
  })
  .strict()

const schema = z
  .object({
    evento: z.object({ data: z.string().min(1), horario: z.string().min(1), local: z.string().min(1) }).strict(),
    contato: z
      .object({
        whatsapp: z.string().regex(/^55\d{10,11}$/),
        whatsappExibicao: z.string().min(1),
        instagram: z.string().regex(/^[a-z0-9._]{1,30}$/),
      })
      .strict(),
    grupos: z
      .array(z.object({ id: z.string().regex(/^grupo-[1-9]\d{0,2}$/), itens: z.array(itemSchema).min(1).max(3) }).strict())
      .min(1)
      .refine((g) => new Set(g.map((x) => x.id)).size === g.length, "ids de grupo repetidos"),
  })
  .strict()

export const soNoEvento = schema.parse(raw)

export type EventoGrupo = (typeof soNoEvento.grupos)[number]
export type EventoItem = EventoGrupo["itens"][number]

export function fotoUrl(foto: string | null | undefined) {
  return foto ? `/so-no-evento/${foto}` : null
}

export function getGrupo(id: string) {
  return soNoEvento.grupos.find((g) => g.id === id) ?? null
}
