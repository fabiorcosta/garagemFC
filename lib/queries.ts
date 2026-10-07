import "server-only"
import { cache } from "react"
import type { Prisma } from "@prisma/client"
import { publicDb as db } from "./db"
import { z } from "zod"
import { PRICE_RANGES } from "./format"
import { resolveTexts } from "./site-texts"

const settingsSelect = {
  siteTitle: true,
  heroTitle: true,
  heroSubtitle: true,
  whatsapp: true,
  saleEndDate: true,
  pickupCity: true,
  pickupNeighborhood: true,
  pickupInfo: true,
  paymentInfo: true,
  announcement: true,
  showCountdown: true,
  showStats: true,
  texts: true,
} satisfies Prisma.SiteSettingsSelect

const DEFAULT_SETTINGS: Prisma.SiteSettingsGetPayload<{ select: typeof settingsSelect }> = {
  siteTitle: "Garagem",
  heroTitle: "Tudo precisa ir!",
  heroSubtitle: "",
  whatsapp: "",
  saleEndDate: null,
  pickupCity: "",
  pickupNeighborhood: "",
  pickupInfo: "",
  paymentInfo: "",
  announcement: "",
  showCountdown: true,
  showStats: true,
  texts: {},
}

export const getSettings = cache(async () => {
  // O visitante só lê. O registro "main" é criado pelo seed no deploy; se faltar, usa os padrões.
  const s = (await db.siteSettings.findUnique({ where: { id: "main" }, select: settingsSelect })) ?? DEFAULT_SETTINGS
  return { ...s, t: resolveTexts(s.texts) }
})

/** Só o que o card precisa. */
export const itemCardSelect = {
  id: true,
  slug: true,
  title: true,
  price: true,
  originalPrice: true,
  status: true,
  acceptsOffers: true,
  pickupFrom: true,
  createdAt: true,
  photos: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, cloud_storage_path: true, thumbnailPath: true } },
} satisfies Prisma.ItemSelect

export type ItemCardData = Prisma.ItemGetPayload<{ select: typeof itemCardSelect }>

/** Disponíveis → reservados → vendidos; dentro do grupo, mais recentes primeiro. */
function sortByStatus<T extends { status: string; createdAt: Date }>(items: T[]) {
  const rank: Record<string, number> = { disponivel: 0, reservado: 1, vendido: 2 }
  return items.sort(
    (a, b) => (rank[a.status] ?? 3) - (rank[b.status] ?? 3) || b.createdAt.getTime() - a.createdAt.getTime(),
  )
}

export async function getStatusCounts() {
  const groups = await db.item.groupBy({ by: ["status"], _count: true })
  const counts = { disponivel: 0, reservado: 0, vendido: 0 }
  for (const g of groups) if (g.status in counts) counts[g.status as keyof typeof counts] = g._count
  return counts
}

export async function getFeaturedItems() {
  const items = await db.item.findMany({
    where: { featured: true },
    select: itemCardSelect,
    orderBy: { createdAt: "desc" },
    take: 16,
  })
  return sortByStatus(items).slice(0, 8)
}

export async function getCategoriesWithCounts() {
  return db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, _count: { select: { items: true } } },
  })
}

export const PAGE_SIZE = 12

/** Filtros vêm da URL (controlada pelo visitante): tudo validado; valor inválido é descartado. */
const one = (v: unknown) => (Array.isArray(v) ? v[0] : v)
const catalogFiltersSchema = z.object({
  q: z.preprocess(one, z.string().trim().max(100).optional()).catch(undefined),
  cat: z.preprocess(one, z.string().regex(/^[a-z0-9-]{1,80}$/).optional()).catch(undefined),
  preco: z.preprocess(one, z.enum(PRICE_RANGES.map((r) => r.value) as [string, ...string[]]).optional()).catch(undefined),
  status: z.preprocess(one, z.literal("disponivel").optional()).catch(undefined),
  page: z.preprocess(one, z.coerce.number().int().min(1).max(500)).catch(1),
})

export type CatalogFilters = z.infer<typeof catalogFiltersSchema>

export function parseCatalogFilters(raw: Record<string, string | string[] | undefined>): CatalogFilters {
  const f = catalogFiltersSchema.parse(raw)
  return { ...f, q: f.q || undefined }
}

export async function getCatalog(f: CatalogFilters) {
  const where: Prisma.ItemWhereInput = {}
  if (f.q) {
    where.OR = [
      { title: { contains: f.q, mode: "insensitive" } },
      { description: { contains: f.q, mode: "insensitive" } },
    ]
  }
  if (f.cat) where.category = { slug: f.cat }
  const range = PRICE_RANGES.find((r) => r.value === f.preco)
  if (range) where.price = { gte: range.min, ...(range.max ? { lte: range.max } : {}) }
  if (f.status === "disponivel") where.status = "disponivel"

  const page = Math.max(1, f.page ?? 1)
  const total = await db.item.count({ where })

  // A ordem por status não é alfabética: uma consulta por grupo, respeitando a paginação global.
  const groups = f.status === "disponivel" ? ["disponivel"] : ["disponivel", "reservado", "vendido"]
  let skip = (page - 1) * PAGE_SIZE
  let remaining = PAGE_SIZE
  const items: ItemCardData[] = []
  for (const status of groups) {
    if (remaining <= 0) break
    const groupWhere = { ...where, status }
    const groupCount = await db.item.count({ where: groupWhere })
    if (skip >= groupCount) {
      skip -= groupCount
      continue
    }
    const rows = await db.item.findMany({
      where: groupWhere,
      select: itemCardSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: remaining,
    })
    items.push(...rows)
    remaining -= rows.length
    skip = 0
  }

  return { items, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
}

export const getItemBySlug = cache(async (slug: string) => {
  if (!/^[a-z0-9-]{1,90}$/.test(slug)) return null
  return db.item.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      price: true,
      originalPrice: true,
      referenceUrl: true,
      dimensions: true,
      pickupFrom: true,
      condition: true,
      status: true,
      acceptsOffers: true,
      category: { select: { name: true, slug: true } },
      photos: { orderBy: { sortOrder: "asc" }, select: { url: true, cloud_storage_path: true, thumbnailPath: true } },
    },
  })
})
