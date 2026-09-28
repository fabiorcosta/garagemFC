import "server-only"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/auth"

export function unauthorized() {
  return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
}

export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

export function notFound() {
  return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
}

/** Envolve um handler admin: responde 401 se não houver sessão de admin. */
export function adminRoute<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args) => {
    if (!(await requireAdmin())) return unauthorized()
    return handler(...args)
  }
}

/** Atualiza as páginas públicas logo após uma alteração no admin. */
export function revalidatePublic() {
  revalidatePath("/", "layout")
}
