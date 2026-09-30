import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { findUserForLogin, rateLimitHit } from "@/lib/db"
import { clientIp, rlKey } from "@/lib/security"

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(1).max(200),
})

// Hash descartável: com e-mail inexistente ainda rodamos o bcrypt, para o tempo de resposta
// não revelar quais e-mails existem.
const DUMMY_HASH = bcrypt.hashSync("hash-descartavel-para-tempo-constante", 12)

export class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited"
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw)
        if (!parsed.success) return null
        const { email, password } = parsed.data

        // Força bruta: por IP (10 / 15 min) e por e-mail (5 / 15 min), contados no banco.
        const ip = clientIp(request.headers)
        const [ipOk, emailOk] = await Promise.all([
          rateLimitHit(rlKey("login-ip", ip), 10, 900),
          rateLimitHit(rlKey("login-email", email), 5, 900),
        ])
        if (!ipOk || !emailOk) throw new TooManyAttempts()

        const user = await findUserForLogin(email)
        const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)
        if (!user || !ok) return null
        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      return session
    },
  },
})
