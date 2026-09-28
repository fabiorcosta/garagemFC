import { db } from "@/lib/db"
import { MessagesList } from "./messages-list"

export default async function MessagesPage() {
  const messages = await db.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { item: { select: { title: true, slug: true } } },
  })
  const unread = messages.filter((m) => !m.read).length
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Mensagens</h1>
        <p className="text-sm text-muted-foreground">
          {unread} {unread === 1 ? "nova" : "novas"} · {messages.length} no total
        </p>
      </div>
      <MessagesList
        messages={messages.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          phone: m.phone,
          message: m.message,
          read: m.read,
          createdAt: m.createdAt.toISOString(),
          item: m.item,
        }))}
      />
    </div>
  )
}
