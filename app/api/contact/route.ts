import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { badRequest } from "@/lib/api"

const schema = z
  .object({
    itemId: z.string().max(40).optional(),
    name: z.string().trim().min(1, "Informe seu nome").max(80),
    email: z.union([z.string().trim().email("E-mail inválido").max(120), z.literal("")]).optional(),
    phone: z.string().trim().max(30).optional(),
    message: z.string().trim().min(1, "Escreva uma mensagem").max(1000),
    website: z.string().optional(), // campo-isca
  })
  .refine((d) => d.email || d.phone, { message: "Informe um telefone ou e-mail" })

// Limite simples por IP (por instância): 5 mensagens a cada 10 minutos.
const hits = new Map<string, number[]>()
function rateLimited(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > 5
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Muitas mensagens seguidas. Tente de novo em alguns minutos." }, { status: 429 })
  }

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos")
  const { website, itemId, ...data } = parsed.data

  // Robô preencheu o campo escondido: finge sucesso e descarta.
  if (website) return NextResponse.json({ ok: true })

  if (itemId) {
    const item = await db.item.findUnique({ where: { id: itemId }, select: { status: true } })
    if (!item) return badRequest("Item não encontrado")
    if (item.status !== "disponivel") return badRequest("Este item não está mais disponível")
  }

  await db.contactMessage.create({
    data: { ...data, email: data.email || null, phone: data.phone || null, itemId: itemId || null },
  })
  return NextResponse.json({ ok: true })
}
