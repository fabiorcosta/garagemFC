import "server-only"
import { cache } from "react"
import type { Prisma } from "@prisma/client"
import { db } from "./db"
import { PRICE_RANGES } from "./format"
import { resolveTexts } from "./site-texts"

export const getSettings = cache(async () => {
  const s =
    (await db.siteSettings.findUnique({ where: { id: "main" } })) ??
    (await db.siteSettings.create({ data: { id: "main" } }))
  return { ...s, t: resolveTexts(s.texts) }
})

export const itemCardInclude = {
  category: { select: { name: true, slug: true } },
  photos: { orderBy: { sortOrder: "asc" }, take: 1 },
} satisfies Prisma.ItemInclude

export type ItemCardData = Prisma.ItemGetPayload<{ include: typeof itemCardInclude }>

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
    include: itemCardInclude,
    orderBy: { createdAt: "desc" },
    take: 16,
  })
  return sortByStatus(items).slice(0, 8)
}

export async function getCategoriesWithCounts() {
  return db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { items: true } } },
  })
}

export const PAGE_SIZE = 12

export type CatalogFilters = { q?: string; cat?: string; preco?: string; status?: string; page?: number }

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
      include: itemCardInclude,
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

export async function getItemBySlug(slug: string) {
  return db.item.findUnique({
    where: { slug },
    include: {
      category: { select: { name: true, slug: true } },
      photos: { orderBy: { sortOrder: "asc" } },
    },
  })
}
