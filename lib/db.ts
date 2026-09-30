import "server-only"
import { PrismaClient } from "@prisma/client"

/**
 * Duas conexões, dois papéis de banco com senhas diferentes (ver scripts/db-security.ts):
 *  - publicDb  → garagem_public (DATABASE_URL): lê catálogo, só insere mensagens, funções de login/limite.
 *  - adminDb   → garagem_admin (ADMIN_DATABASE_URL): só entregue por lib/admin-auth.ts depois de validar a sessão.
 * Mesmo com SQL executado na conexão pública, o banco não deixa subir para admin.
 */
const globalForPrisma = globalThis as unknown as { prismaPublic?: PrismaClient; prismaAdmin?: PrismaClient }

export const publicDb = globalForPrisma.prismaPublic ?? new PrismaClient()

function createAdminClient() {
  const url = process.env.ADMIN_DATABASE_URL
  if (!url) throw new Error("ADMIN_DATABASE_URL não definida")
  return new PrismaClient({ datasourceUrl: url })
}

let adminClient = globalForPrisma.prismaAdmin

/** Só lib/admin-auth.ts chama isto, depois de validar a sessão no servidor. */
export function _adminDbAfterAuthCheck() {
  adminClient ??= createAdminClient()
  if (process.env.NODE_ENV !== "production") globalForPrisma.prismaAdmin = adminClient
  return adminClient
}

export type AdminDb = ReturnType<typeof _adminDbAfterAuthCheck>

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaPublic = publicDb

/** Limite de tentativas atômico no banco (função SECURITY DEFINER). true = pode seguir. */
export async function rateLimitHit(key: string, max: number, windowSeconds: number) {
  const [row] = await publicDb.$queryRaw<{ ok: boolean }[]>`
    SELECT rate_limit_hit(${key}, ${max}::int, ${windowSeconds}::int) AS ok`
  return row?.ok === true
}

/** Busca o usuário do login pela função fechada (a tabela User não tem acesso direto). */
export async function findUserForLogin(email: string) {
  const [user] = await publicDb.$queryRaw<
    { id: string; email: string; name: string | null; passwordHash: string; role: string }[]
  >`SELECT * FROM auth_find_user(${email})`
  return user ?? null
}

/** O usuário da sessão ainda existe e ainda é admin? */
export async function isStillAdmin(id: string) {
  const [row] = await publicDb.$queryRaw<{ ok: boolean }[]>`SELECT auth_is_admin(${id}) AS ok`
  return row?.ok === true
}
