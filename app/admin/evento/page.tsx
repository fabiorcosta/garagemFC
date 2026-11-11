import { adminPageContext } from "@/lib/admin-auth"
import { eventItemFields } from "@/lib/event-item-service"
import { getFileUrl } from "@/lib/file-url"
import { siteUrl } from "@/lib/format"
import { EventManager } from "./event-manager"
import { EventSettingsForm } from "./event-settings-form"

export default async function EventAdminPage() {
  const { db } = await adminPageContext()
  const [items, settings] = await Promise.all([
    db.eventItem.findMany({ orderBy: [{ group: "asc" }, { createdAt: "asc" }], select: eventItemFields }),
    db.siteSettings.findUnique({
      where: { id: "main" },
      select: {
        eventDate: true,
        eventStart: true,
        eventEnd: true,
        eventPlace: true,
        eventInstructions: true,
        eventWhatsapp: true,
        eventInstagram: true,
      },
    }),
  ])
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">Só no evento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Itens da página escondida <span className="font-medium text-foreground">/so-no-evento</span>. Ela não aparece no menu
          nem no catálogo: só quem tem o link chega lá. Cada grupo leva até 3 itens e tem um link próprio para usar no anúncio.
        </p>
      </div>
      <EventSettingsForm
        initial={
          settings ?? { eventDate: "", eventStart: "", eventEnd: "", eventPlace: "", eventInstructions: "", eventWhatsapp: "", eventInstagram: "" }
        }
      />
      <EventManager
        baseUrl={`${siteUrl()}/so-no-evento`}
        items={items.map((i) => ({ ...i, preview: getFileUrl(i.thumbPath) ?? getFileUrl(i.photoPath) }))}
      />
    </div>
  )
}
