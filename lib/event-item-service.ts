import "server-only"
import type { Prisma } from "@prisma/client"
import { z } from "zod"
import { isValidKey } from "./s3"
import { ValidationError } from "./item-service"

/** Até 3 itens por grupo: cada grupo vira um anúncio com endereço próprio. */
export const GROUP_SIZE = 3
export const MAX_GROUP = 99

/**
 * Tudo o que o navegador pode mandar (strictObject: campo extra = recusado).
 * Sem preço antigo/riscado (regra do dono). As fotos só podem ser chaves do nosso bucket
 * no formato gerado por /api/admin/upload — nunca um endereço externo.
 */
export const eventItemSchema = z
  .strictObject({
    group: z.number().int("Grupo inválido").min(1, "Grupo inválido").max(MAX_GROUP, `Grupo: no máximo ${MAX_GROUP}`),
    name: z.string().trim().min(1, "Nome é obrigatório").max(80, "Nome: no máximo 80 caracteres"),
    price: z.number().int("Preço em reais, sem centavos").min(1, "Preço inválido").max(100_000, "Preço alto demais"),
    description: z.string().trim().max(120, "Descrição: no máximo 120 caracteres").default(""),
    photoPath: z.string().refine(isValidKey, "Foto inválida").nullable().default(null),
    thumbPath: z.string().refine(isValidKey, "Foto inválida").nullable().default(null),
    sold: z.boolean().default(false),
    published: z.boolean().default(true),
  })
  .refine((d) => !d.thumbPath || d.photoPath, "Foto inválida")

/** Ação rápida da lista: vendido / visível. */
export const eventQuickSchema = z
  .strictObject({ sold: z.boolean().optional(), published: z.boolean().optional() })
  .refine((d) => d.sold !== undefined || d.published !== undefined, "Nada para alterar")

/** Campos devolvidos ao painel (nada além disso). */
export const eventItemFields = {
  id: true,
  group: true,
  name: true,
  price: true,
  description: true,
  photoPath: true,
  thumbPath: true,
  sold: true,
  published: true,
} satisfies Prisma.EventItemSelect

type Tx = Prisma.TransactionClient

/** O grupo de destino ainda tem vaga? (ignora o próprio item, ao editar) */
export async function assertGroupHasRoom(tx: Tx, group: number, ignoreId?: string) {
  const n = await tx.eventItem.count({ where: { group, ...(ignoreId ? { id: { not: ignoreId } } : {}) } })
  if (n >= GROUP_SIZE) throw new ValidationError(`O grupo ${group} já tem ${GROUP_SIZE} itens. Escolha outro grupo.`)
}

/**
 * Uma foto nova não pode reaproveitar arquivo de outro item (do catálogo ou do evento):
 * apagar um apagaria o arquivo do outro.
 */
export async function assertPhotoKeysFree(tx: Tx, keys: (string | null)[], ignoreId?: string) {
  const list = keys.filter((k): k is string => !!k)
  if (!list.length) return
  if (new Set(list).size !== list.length) throw new ValidationError("Foto repetida")
  const [catalog, event] = await Promise.all([
    tx.itemPhoto.count({ where: { OR: [{ cloud_storage_path: { in: list } }, { thumbnailPath: { in: list } }] } }),
    tx.eventItem.count({
      where: {
        OR: [{ photoPath: { in: list } }, { thumbPath: { in: list } }],
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
    }),
  ])
  if (catalog || event) throw new ValidationError("Foto já usada em outro item")
}
