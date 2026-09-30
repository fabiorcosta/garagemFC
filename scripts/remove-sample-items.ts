/**
 * Limpeza única dos itens de exemplo em produção. Só roda com REMOVE_SAMPLE_ITEMS=true (roda no db:deploy).
 * Usa o papel garagem_admin (menor privilégio suficiente), não o dono.
 *
 * Um item só é apagado se bater TUDO: slug de um exemplo + descrição idêntica + nenhuma foto + nenhuma mensagem.
 * Item real com o mesmo nome, ou com foto, fica intacto. Tudo em uma transação, com relatório no log.
 * Também avisa quais configurações ainda estão com os textos provisórios do seed.
 */
import { PrismaClient } from "@prisma/client"
import { slugify } from "../lib/format"
import { SAMPLE_ITEMS } from "./sample-items"

if (process.env.REMOVE_SAMPLE_ITEMS !== "true") process.exit(0)

const url = process.env.ADMIN_DATABASE_URL
if (!url) throw new Error("ADMIN_DATABASE_URL não definida")
const db = new PrismaClient({ datasourceUrl: url })

const PLACEHOLDERS: Record<string, string> = {
  whatsapp: "11999999999",
  pickupNeighborhood: "Bairro a definir",
  pickupCity: "São Paulo - SP",
}

async function main() {
  const samples = new Map(SAMPLE_ITEMS.map((s) => [slugify(s.title), s.description]))

  const result = await db.$transaction(async (tx) => {
    const candidates = await tx.item.findMany({
      where: { slug: { in: [...samples.keys()] } },
      select: { id: true, slug: true, description: true, _count: { select: { photos: true, messages: true } } },
    })
    const toDelete = candidates.filter(
      (c) => samples.get(c.slug) === c.description && c._count.photos === 0 && c._count.messages === 0,
    )
    const kept = candidates.filter((c) => !toDelete.includes(c))
    await tx.item.deleteMany({ where: { id: { in: toDelete.map((c) => c.id) } } })
    return { deleted: toDelete.map((c) => c.slug), kept: kept.map((c) => `${c.slug} (fotos=${c._count.photos}, msgs=${c._count.messages})`) }
  })

  console.log(`[limpeza] apagados ${result.deleted.length} exemplos: ${result.deleted.join(", ") || "nenhum"}`)
  if (result.kept.length) console.log(`[limpeza] mantidos (não batem com exemplo intocado): ${result.kept.join("; ")}`)

  const remaining = await db.item.findMany({ orderBy: { createdAt: "asc" }, select: { slug: true, status: true, _count: { select: { photos: true } } } })
  console.log(`[limpeza] itens no site agora: ${remaining.length} → ${remaining.map((i) => `${i.slug}(${i._count.photos} fotos)`).join(", ") || "nenhum"}`)

  const s = await db.siteSettings.findUnique({ where: { id: "main" } })
  if (s) {
    const pending = Object.entries(PLACEHOLDERS).filter(([k, v]) => (s as unknown as Record<string, unknown>)[k] === v).map(([k]) => k)
    console.log(`[limpeza] configurações ainda provisórias: ${pending.join(", ") || "nenhuma"}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
