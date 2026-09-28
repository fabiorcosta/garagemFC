import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { SessionProvider } from "next-auth/react"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { AdminNav } from "./admin-nav"

export const metadata: Metadata = { title: "Admin", robots: { index: false } }

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await auth()
  if (session?.user?.role !== "admin") redirect("/login")
  const unread = await db.contactMessage.count({ where: { read: false } })

  return (
    <SessionProvider session={session}>
      <div className="flex flex-1 flex-col md:flex-row">
        <AdminNav unread={unread} />
        <main className="w-full flex-1 px-4 py-6 pb-24 md:px-8 md:pb-10">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </SessionProvider>
  )
}
