import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { LoginForm } from "./login-form"

export const metadata: Metadata = { title: "Entrar", robots: { index: false } }

export default async function LoginPage() {
  const session = await auth()
  if (session?.user?.role === "admin") redirect("/admin")

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-3xl border bg-card p-6 shadow-sm">
        <Link href="/" className="mb-6 flex items-center gap-2 text-lg font-extrabold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
            G
          </span>
          Painel da Garagem
        </Link>
        <LoginForm />
      </div>
    </main>
  )
}
