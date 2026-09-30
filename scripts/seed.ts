import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { slugify } from "../lib/format"

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

type SeedItem = {
  title: string
  description: string
  price: number
  originalPrice?: number
  condition: string
  status?: "disponivel" | "reservado" | "vendido"
  acceptsOffers?: boolean
  featured?: boolean
  category: string
}

const items: SeedItem[] = [
  {
    title: "Sofá retrátil 3 lugares cinza",
    description: "Sofá retrátil e reclinável, tecido suede cinza, 2,30 m. Muito confortável, sem rasgos. Desmonta para transporte.",
    price: 1800,
    originalPrice: 2400,
    condition: "Ótimo estado",
    featured: true,
    acceptsOffers: true,
    category: "Sofás e Poltronas",
  },
  {
    title: "Poltrona do papai em couro",
    description: "Poltrona reclinável em couro sintético marrom. Mecanismo funcionando perfeitamente.",
    price: 650,
    condition: "Bom estado",
    category: "Sofás e Poltronas",
  },
  {
    title: "Smart TV Samsung 55\" 4K",
    description: "TV Samsung Crystal UHD 55 polegadas, 2023. Acompanha controle, suporte de parede e caixa original.",
    price: 2100,
    originalPrice: 2600,
    condition: "Seminovo",
    featured: true,
    category: "Eletrônicos",
  },
  {
    title: "Soundbar JBL Bar 2.1",
    description: "Soundbar com subwoofer sem fio. Bluetooth e HDMI ARC. Som excelente.",
    price: 900,
    condition: "Ótimo estado",
    status: "reservado",
    category: "Eletrônicos",
  },
  {
    title: "Geladeira Brastemp Frost Free 400L",
    description: "Geladeira duplex inox, frost free, 400 litros. Funcionando perfeitamente, sem amassados.",
    price: 2300,
    condition: "Bom estado",
    featured: true,
    acceptsOffers: true,
    category: "Eletrodomésticos",
  },
  {
    title: "Máquina de lavar Electrolux 12kg",
    description: "Lavadora top load 12 kg com cesto inox. Uso de 3 anos, nunca deu problema.",
    price: 1100,
    condition: "Bom estado",
    status: "vendido",
    category: "Eletrodomésticos",
  },
  {
    title: "Micro-ondas Panasonic 32L",
    description: "Micro-ondas inox 32 litros, painel digital. Limpo e funcionando.",
    price: 350,
    originalPrice: 450,
    condition: "Seminovo",
    category: "Eletrodomésticos",
  },
  {
    title: "Mesa de jantar 6 lugares madeira maciça",
    description: "Mesa em madeira maciça (1,80 x 0,90 m) com 6 cadeiras estofadas. Pequenas marcas de uso no tampo.",
    price: 2500,
    condition: "Com marcas de uso",
    featured: true,
    acceptsOffers: true,
    category: "Móveis",
  },
  {
    title: "Rack para sala com painel",
    description: "Rack 1,80 m com painel para TV até 65\". Cor off-white com freijó.",
    price: 480,
    condition: "Bom estado",
    status: "reservado",
    category: "Móveis",
  },
  {
    title: "Cama box queen com colchão",
    description: "Cama box queen size com colchão de molas ensacadas. Sempre usado com protetor.",
    price: 1200,
    condition: "Ótimo estado",
    status: "vendido",
    category: "Cama/Mesa/Banho",
  },
  {
    title: "Jogo de toalhas 100% algodão (8 peças)",
    description: "Kit com 4 toalhas de banho e 4 de rosto, cor areia. Usadas poucas vezes.",
    price: 120,
    condition: "Seminovo",
    category: "Cama/Mesa/Banho",
  },
  {
    title: "Bicicleta aro 29 Caloi",
    description: "Mountain bike aro 29, 21 marchas, freio a disco. Revisada recentemente.",
    price: 950,
    originalPrice: 1200,
    condition: "Bom estado",
    category: "Diversos",
  },
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
  const catIds: Record<string, string> = {}
  if ((await db.category.count()) === 0) {
    for (const [i, name] of categories.entries()) {
      const cat = await db.category.create({ data: { name, slug: slugify(name), sortOrder: i } })
      catIds[name] = cat.id
    }
  }

  // Itens de exemplo: só com SEED_SAMPLE_ITEMS=true (desenvolvimento) e num banco vazio.
  // Em produção o seed roda a cada start; sem essa trava, apagar todos os itens os traria de volta.
  if (process.env.SEED_SAMPLE_ITEMS === "true" && (await db.item.count()) === 0) {
    for (const it of items) {
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
