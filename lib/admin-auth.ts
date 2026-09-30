import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import type { Prisma } from "@prisma/client"
import { auth } from "@/auth"
import { _adminDbAfterAuthCheck, isStillAdmin } from "./db"

/**
 * Único caminho para obter acesso admin ao banco.
 * 1) JWT assinado válido (NextAuth);  2) o usuário ainda existe e ainda é admin NO BANCO.
 * Assim, apagar/rebaixar o usuário derruba sessões já emitidas.
 */
type AdminTransaction = <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => Promise<T>

export const requireAdmin = cache(async () => {
  const session = await auth()
  const id = session?.user?.id
  if (!id || session.user.role !== "admin") return null
  if (!(await isStillAdmin(id))) return null
  const db = _adminDbAfterAuthCheck()
  return {
    session,
    db,
    transaction: db.$transaction.bind(db) as AdminTransaction,
  }
})

export type AdminContext = NonNullable<Awaited<ReturnType<typeof requireAdmin>>>

/** Para páginas do admin: sem admin válido, vai para o login. */
export async function adminPageContext() {
  const ctx = await requireAdmin()
  if (!ctx) redirect("/login")
  return ctx
}
