"use server"

import { AuthError } from "next-auth"
import { signIn } from "@/auth"

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  try {
    await signIn("credentials", {
      email: String(form.get("email") ?? "").trim().toLowerCase(),
      password: String(form.get("password") ?? ""),
      redirectTo: "/admin",
    })
    return null
  } catch (err) {
    if (err instanceof AuthError) return "E-mail ou senha incorretos."
    throw err // o redirect do login bem-sucedido chega aqui como exceção
  }
}
