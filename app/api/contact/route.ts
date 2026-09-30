import { NextResponse } from "next/server"
import { z } from "zod"
import { publicDb, rateLimitHit } from "@/lib/db"
import { badRequest, forbidden, idSchema, readJson, tooMany } from "@/lib/api"
import { clientIp, isSameOrigin, rlKey } from "@/lib/security"

const schema = z
  .strictObject({
    itemId: idSchema.optional(),
    name: z.string().trim().min(1, "Informe seu nome").max(80),
    email: z.union([z.string().trim().email("E-mail inválido").max(120), z.literal("")]).optional(),
    phone: z
      .string()
      .trim()
      .max(30)
      .refine((v) => v === "" || /^[+\d\s().-]{8,30}$/.test(v), "Telefone inválido")
      .optional(),
    message: z.string().trim().min(1, "Escreva uma mensagem").max(1000),
    website: z.string().max(200).optional(), // campo-isca
  })
  .refine((d) => d.email || d.phone, { message: "Informe um telefone ou e-mail" })

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbidden()
  // Por IP: 5 a cada 10 min. No site todo: 300 por hora (freio contra ataque distribuído).
  const [ipOk, globalOk] = await Promise.all([
    rateLimitHit(rlKey("contact-ip", clientIp(req.headers)), 5, 600),
    rateLimitHit("contact-global", 300, 3600),
  ])
  if (!ipOk || !globalOk) return tooMany()

  const parsed = schema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos")
  const { website, itemId, ...data } = parsed.data

  // Robô preencheu o campo escondido: finge sucesso e descarta.
  if (website) return NextResponse.json({ ok: true })

  if (itemId) {
    const item = await publicDb.item.findUnique({ where: { id: itemId }, select: { status: true } })
    if (!item) return badRequest("Item não encontrado")
    if (item.status !== "disponivel") return badRequest("Este item não está mais disponível")
  }

  // createMany não usa RETURNING: o visitante só pode INSERIR mensagens, nunca lê-las (RLS).
  await publicDb.contactMessage.createMany({
    data: [{ ...data, email: data.email || null, phone: data.phone || null, itemId: itemId ?? null, read: false }],
  })
  return NextResponse.json({ ok: true })
}
