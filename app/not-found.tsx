import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <p className="text-5xl font-black text-primary">404</p>
      <h1 className="text-xl font-bold">Página não encontrada</h1>
      <p className="text-muted-foreground">Esse item pode ter sido removido.</p>
      <Link href="/itens" className="mt-2 rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground">
        Ver itens disponíveis
      </Link>
    </main>
  )
}
