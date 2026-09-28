import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { adminRoute, badRequest, revalidatePublic } from "@/lib/api"

const text = (max: number) => z.string().trim().max(max).default("")

const schema = z.object({
  siteTitle: z.string().trim().min(1, "Título do site é obrigatório").max(60),
  heroTitle: z.string().trim().min(1, "Título do hero é obrigatório").max(120),
  heroSubtitle: text(300),
  whatsapp: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === "" || /^\+?[\d\s()-]{10,20}$/.test(v), "WhatsApp inválido (use DDD + número)"),
  saleEndDate: z.string().nullable().optional(),
  pickupCity: text(80),
  pickupNeighborhood: text(80),
  pickupInfo: text(2000),
  paymentInfo: text(2000),
  announcement: text(160),
})

export const GET = adminRoute(async () => {
  const settings = await db.siteSettings.upsert({ where: { id: "main" }, update: {}, create: { id: "main" } })
  return NextResponse.json(settings)
})

export const PUT = adminRoute(async (req: Request) => {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos")
  const { saleEndDate, ...rest } = parsed.data
  // A data vem do <input type="date"> (AAAA-MM-DD): fim do dia no horário de Brasília.
  const end = saleEndDate ? new Date(`${saleEndDate}T23:59:59-03:00`) : null
  if (end && Number.isNaN(end.getTime())) return badRequest("Data inválida")
  const data = { ...rest, saleEndDate: end }
  const settings = await db.siteSettings.upsert({ where: { id: "main" }, update: data, create: { id: "main", ...data } })
  revalidatePublic()
  return NextResponse.json(settings)
})
