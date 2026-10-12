/**
 * Remoções de colunas planejadas, ANTES do `prisma db push` (que, com razão, se recusa a apagar dados sozinho).
 * Cada linha é uma decisão explícita; só remove o que estiver listado aqui. Idempotente (IF EXISTS).
 */
import { PrismaClient } from "@prisma/client"

const url = process.env.MIGRATE_DATABASE_URL
if (!url) throw new Error("MIGRATE_DATABASE_URL não definida")
const db = new PrismaClient({ datasourceUrl: url })

const DROPS = [
  // 2026-10-11: campo "Vendido por" removido a pedido (só o nome do comprador interessa)
  `ALTER TABLE IF EXISTS "Sale" DROP COLUMN IF EXISTS "soldBy"`,
]

async function main() {
  for (const sql of DROPS) await db.$executeRawUnsafe(sql)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
