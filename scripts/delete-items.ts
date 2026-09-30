/**
 * Exclusão pontual de itens em produção, sem precisar do navegador. Roda no db:deploy só se
 * DELETE_ITEM_SLUGS estiver definida (slugs exatos, separados por vírgula). Remova a variável depois.
 * Usa o papel garagem_admin. Apaga o item (fotos e vínculos saem em cascata) e depois os arquivos no bucket.
 */
import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import { PrismaClient } from "@prisma/client"
import { getS3Client, s3Config, useLocalStorage } from "../lib/aws-config"

const raw = process.env.DELETE_ITEM_SLUGS?.trim()
if (!raw) process.exit(0)

const slugs = raw.split(",").map((s) => s.trim())
if (slugs.length > 20 || slugs.some((s) => !/^[a-z0-9-]{1,90}$/.test(s))) {
  throw new Error("DELETE_ITEM_SLUGS inválida: use slugs exatos (a-z, 0-9, -), no máximo 20")
}
const url = process.env.ADMIN_DATABASE_URL
if (!url) throw new Error("ADMIN_DATABASE_URL não definida")
const db = new PrismaClient({ datasourceUrl: url })
const KEY = /^items\/[0-9a-f-]{36}-(full|thumb)\.(jpg|png|webp)$/

async function main() {
  const { deleted, keys } = await db.$transaction(async (tx) => {
    const items = await tx.item.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true, photos: { select: { cloud_storage_path: true, thumbnailPath: true } } },
    })
    await tx.item.deleteMany({ where: { id: { in: items.map((i) => i.id) } } })
    return {
      deleted: items.map((i) => i.slug),
      keys: items.flatMap((i) => i.photos.flatMap((p) => [p.cloud_storage_path, p.thumbnailPath])).filter((k): k is string => !!k && KEY.test(k)),
    }
  })

  let files = 0
  if (!useLocalStorage) {
    for (const key of keys) {
      await getS3Client().send(new DeleteObjectCommand({ Bucket: s3Config.bucket, Key: key }))
      files++
    }
  }
  const missing = slugs.filter((s) => !deleted.includes(s))
  console.log(`[exclusão] itens apagados: ${deleted.join(", ") || "nenhum"}; arquivos removidos do bucket: ${files}`)
  if (missing.length) console.log(`[exclusão] não encontrados (nada feito): ${missing.join(", ")}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
