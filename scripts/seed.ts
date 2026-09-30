import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { slugify } from "../lib/format"
import { SAMPLE_ITEMS } from "./sample-items"

// Roda com o papel DONO (as tabelas têm RLS forçado; o papel do app não enxerga "User").
const db = new PrismaClient({ datasourceUrl: process.env.MIGRATE_DATABASE_URL })

const categories = [
  "Sofás e Poltronas",
  "Eletrônicos",
  "Eletrodomésticos",
  "Móveis",
  "Cama/Mesa/Banho",
  "Diversos",
]


const BCRYPT_HASH = /^\$2[aby]\$1[0-4]\$[./A-Za-z0-9]{53}$/

/**
 * Admin:
 *  - ADMIN_PASSWORD_HASH (produção): só o hash fica nas variáveis; é aplicado se mudou.
 *  - SEED_ADMIN_PASSWORD (desenvolvimento): usado só para CRIAR o admin; nunca sobrescreve senha existente.
 */
async function ensureAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
  if (!email) throw new Error("Defina SEED_ADMIN_EMAIL")
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim()
  const plain = process.env.SEED_ADMIN_PASSWORD
  if (hash && !BCRYPT_HASH.test(hash)) throw new Error("ADMIN_PASSWORD_HASH não é um hash bcrypt válido")

  const existing = await db.user.findUnique({ where: { email }, select: { passwordHash: true } })
  if (existing) {
    if (hash && existing.passwordHash !== hash) {
      await db.user.update({ where: { email }, data: { passwordHash: hash } })
      return "senha atualizada pelo hash"
    }
    return "sem alteração"
  }
  if (!hash && (!plain || plain.length < 12)) throw new Error("Admin inexistente: defina ADMIN_PASSWORD_HASH (ou SEED_ADMIN_PASSWORD com 12+ caracteres)")
  await db.user.create({
    data: { email, name: "Fabio", role: "admin", passwordHash: hash ?? (await bcrypt.hash(plain!, 12)) },
  })
  return "criado"
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL
  const adminStatus = await ensureAdmin()

  // Categorias padrão só num banco sem nenhuma (senão, apagar uma no admin a traria de volta).
  if ((await db.category.count()) === 0) {
    for (const [i, name] of categories.entries()) {
      await db.category.create({ data: { name, slug: slugify(name), sortOrder: i } })
    }
  }
  const existingCats = await db.category.findMany({ select: { id: true, slug: true } })
  const catIds = Object.fromEntries(
    categories.map((name) => [name, existingCats.find((c) => c.slug === slugify(name))?.id]),
  ) as Record<string, string | undefined>

  // Itens de exemplo: só com SEED_SAMPLE_ITEMS=true (desenvolvimento) e num banco vazio.
  // Em produção o seed roda a cada start; sem essa trava, apagar todos os itens os traria de volta.
  if (process.env.SEED_SAMPLE_ITEMS === "true" && (await db.item.count()) === 0) {
    for (const it of SAMPLE_ITEMS) {
      const { category, ...data } = it
      await db.item.create({ data: { ...data, slug: slugify(it.title), categoryId: catIds[category] ?? null } })
    }
  }

  await db.siteSettings.upsert({
    where: { id: "main" },
    update: {},
    create: {
      id: "main",
      siteTitle: "Garagem do Fabio",
      heroTitle: "Estou de mudança para os EUA — tudo precisa ir!",
      heroSubtitle: "Móveis, eletrônicos e eletrodomésticos bem cuidados, com preço de desapego. Retirada no local.",
      whatsapp: "11999999999",
      saleEndDate: new Date("2026-12-15T23:59:59-03:00"),
      pickupCity: "São Paulo - SP",
      pickupNeighborhood: "Bairro a definir",
      pickupInfo: "Retirada com hora marcada, de segunda a sábado. O transporte é por conta do comprador; ajudo a descer os itens.",
      paymentInfo: "Pix ou dinheiro na retirada. Para reservar, peço um sinal de 20% via Pix.",
      announcement: "",
    },
  })

  console.log(`Seed ok: admin ${email} (${adminStatus}), ${await db.category.count()} categorias, ${await db.item.count()} itens.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
