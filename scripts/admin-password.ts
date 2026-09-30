/**
 * Gera o ADMIN_PASSWORD_HASH para uma senha nova, sem a senha aparecer na tela nem ficar no histórico.
 * Uso: npm run admin:hash  → digite a senha 2x → cole o hash na variável ADMIN_PASSWORD_HASH do Railway.
 */
import bcrypt from "bcryptjs"
import { createInterface } from "node:readline"

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    // Esconde o que é digitado
    ;(rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      if (s.includes(question)) process.stdout.write(s)
    }
    rl.question(question, (answer) => {
      rl.close()
      process.stdout.write("\n")
      resolve(answer)
    })
  })
}

async function main() {
  const a = await ask("Nova senha do admin (mín. 14 caracteres): ")
  if (a.length < 14) throw new Error("Senha curta demais (mínimo 14 caracteres).")
  const b = await ask("Repita a senha: ")
  if (a !== b) throw new Error("As senhas não conferem.")
  const hash = await bcrypt.hash(a, 12)
  console.log("\nCole este valor em ADMIN_PASSWORD_HASH (Railway → garagemFC → Variables):\n")
  console.log(hash)
}

main().catch((e) => {
  console.error((e as Error).message)
  process.exit(1)
})
