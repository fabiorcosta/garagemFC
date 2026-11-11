import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { adminRoute, badRequest, readJson, revalidatePublic } from "@/lib/api"
import { assertGroupHasRoom, assertPhotoKeysFree, eventItemFields, eventItemSchema } from "@/lib/event-item-service"
import { ValidationError } from "@/lib/item-service"

export const GET = adminRoute(async (_req, _ctx, { db }) => {
  const items = await db.eventItem.findMany({ orderBy: [{ group: "asc" }, { createdAt: "asc" }], select: eventItemFields })
  return NextResponse.json(items)
})

export const POST = adminRoute(async (req, _ctx, { db }) => {
  const parsed = eventItemSchema.safeParse(await readJson(req))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Dados inválidos")
  const data = parsed.data
  try {
    // Serializable: duas gravações ao mesmo tempo não conseguem pôr o 4º item num grupo.
    const item = await db.$transaction(
      async (tx) => {
        await assertGroupHasRoom(tx, data.group)
        await assertPhotoKeysFree(tx, [data.photoPath, data.thumbPath])
        return tx.eventItem.create({ data, select: eventItemFields })
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    revalidatePublic()
    return NextResponse.json(item, { status: 201 })
  } catch (e) {
    if (e instanceof ValidationError) return badRequest(e.message)
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") {
      return badRequest("Outra alteração aconteceu ao mesmo tempo. Tente de novo.")
    }
    throw e
  }
})
