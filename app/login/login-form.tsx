"use client"

import { useActionState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login } from "./actions"

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null)
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required autoComplete="username" className="h-11" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" className="h-11" />
      </div>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      <Button type="submit" disabled={pending} className="h-11 rounded-full text-base font-semibold">
        {pending && <Loader2 className="animate-spin" />}
        Entrar
      </Button>
    </form>
  )
}
