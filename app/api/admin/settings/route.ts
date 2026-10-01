import { NextResponse } from "next/server"
import { z } from "zod"
import { adminRoute, badRequest, readJson, revalidatePublic } from "@/lib/api"
import { TEXTS, type TextKey } from "@/lib/site-texts"

const text = (max: number) => z.string().trim().max(max).default("")

const schema = z.strictObject({
  siteTitle: z.string().trim().min(1, "Título do site é obrigatório").max(60),
  heroTitle: z.string().trim().min(1, "Título do hero é obrigatório").max(120),
  heroSubtitle: text(300),
  whatsapp: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === "" || /^\+?[\d\s()-]{10,20}$/.test(v), "WhatsApp inválido (use DDD + número)"),
  saleEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida").nullable().optional(),
  pickupCity: text(80),
  pickupNeighborhood: text(80),
  pickupInfo: text(2000),
  paymentInfo: text(2000),
  announcement: text(160),
  showCountdown: z.boolean().default(true),
  showStats: z.boolean().default(true),
  texts: z
    .record(z.string().max(40), z.string().max(5000))
    .refine((o) => Object.keys(o).length <= 100, "Textos demais")
    .default({}),
})

/** Guarda só as chaves conhecidas; texto igual ao padrão ou vazio não é salvo (continua seguindo o padrão). */
function cleanTexts(input: Record<string, string>): Record<string, string> | string {
  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(input)) {
    const def = TEXTS[key as TextKey]
    if (!def) continue
    const value = raw.trim()
    if (value.length > def.max) return `"${def.label}" passou de ${def.max} caracteres`
    if (key === "pickupMapUrl" && value && !isHttpsUrl(value)) return "O link do mapa precisa começar com https://"
    if (value && value !== def.default) out[key] = value
  }
  return out
}

function isHttpsUrl(v: string) {
  try {
    return new URL(v).protocol === "https:"
  } catch {
    return false
  }
}

const settingsFields = {
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
} as const

export const GET = adminRoute(async (_req, _ctx, { db }) => {
  const settings = await db.siteSettings.findUnique({ where: { id: "main" }, select: settingsFields })
  return NextResponse.json(settings)
})

export const PUT = adminRoute(async (req, _ctx, { db }) => {
  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos")
  const { saleEndDate, texts, ...rest } = parsed.data
  const cleaned = cleanTexts(texts)
  if (typeof cleaned === "string") return badRequest(cleaned)
  // A data vem do <input type="date"> (AAAA-MM-DD): fim do dia no horário de Brasília.
  const end = saleEndDate ? new Date(`${saleEndDate}T23:59:59-03:00`) : null
  if (end && Number.isNaN(end.getTime())) return badRequest("Data inválida")
  const data = { ...rest, saleEndDate: end, texts: cleaned }
  await db.siteSettings.upsert({ where: { id: "main" }, update: data, create: { id: "main", ...data }, select: { id: true } })
  revalidatePublic()
  return NextResponse.json({ ok: true })
})
