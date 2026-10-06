import { NextResponse } from "next/server"
import { z } from "zod"
import { publicDb, rateLimitHit } from "@/lib/db"
import { disclaimerVersion as disclaimerVersionOf } from "@/lib/disclaimer"
import { getSettings } from "@/lib/queries"
import { siteUrl } from "@/lib/format"
import { notifyNewMessage } from "@/lib/notify"
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
    disclaimerAccepted: z.literal(true, { message: "É preciso confirmar o aviso sobre a garantia" }),
    disclaimerVersion: z.string().regex(/^[0-9a-f]{12}$/, "Aviso inválido"),
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
  // disclaimerAccepted já foi exigido como `true` pelo schema; não vai para o banco
  const { website, itemId, disclaimerAccepted, disclaimerVersion, ...data } = parsed.data
  void disclaimerAccepted

  // Robô preencheu o campo escondido: finge sucesso e descarta.
  if (website) return NextResponse.json({ ok: true })

  // O texto aceito precisa ser o texto em vigor (se o admin mudou o aviso, o comprador relê)
  const settings = await getSettings()
  if (disclaimerVersion !== disclaimerVersionOf(settings.t)) {
    return NextResponse.json({ error: "O aviso foi atualizado. Recarregue a página e confirme de novo." }, { status: 409 })
  }

  let item: { status: string; title: string; slug: string } | null = null
  if (itemId) {
    item = await publicDb.item.findUnique({ where: { id: itemId }, select: { status: true, title: true, slug: true } })
    if (!item) return badRequest("Item não encontrado")
    if (item.status !== "disponivel") return badRequest("Este item não está mais disponível")
  }

  // createMany não usa RETURNING: o visitante só pode INSERIR mensagens, nunca lê-las (RLS).
  await publicDb.contactMessage.createMany({
    data: [
      {
        ...data,
        email: data.email || null,
        phone: data.phone || null,
        itemId: itemId ?? null,
        read: false,
        // Data do servidor (não do navegador) + qual texto foi aceito
        disclaimerAcceptedAt: new Date(),
        disclaimerVersion,
      },
    ],
  })
  // Aviso por e-mail depois de salvo: se o e-mail falhar, a mensagem continua no painel
  await notifyNewMessage({
    name: data.name,
    phone: data.phone || null,
    email: data.email || null,
    message: data.message,
    itemTitle: item?.title ?? null,
    itemUrl: item ? `${siteUrl()}/itens/${item.slug}` : null,
    adminUrl: `${siteUrl()}/admin/mensagens`,
  })
  return NextResponse.json({ ok: true })
}
