import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, ExternalLink, Ruler, Sparkles } from "lucide-react"
import { OffersBadge, Price, StatusBadge } from "@/components/item-badges"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { photoFullUrl } from "@/lib/file-url"
import { formatPrice, safeHttpsUrl, siteUrl } from "@/lib/format"
import { getItemBySlug, getSettings } from "@/lib/queries"
import { fill } from "@/lib/site-texts"
import { ContactForm } from "./contact-form"
import { Gallery } from "./gallery"
import { ShareButton, TrackView } from "./share-button"

// Sempre gerada na hora: a CSP usa um nonce novo por visita (ver proxy.ts).
export const dynamic = "force-dynamic"

export async function generateMetadata(props: PageProps<"/itens/[slug]">): Promise<Metadata> {
  const { slug } = await props.params
  const item = await getItemBySlug(slug)
  if (!item) return { title: "Item não encontrado" }
  const photo = photoFullUrl(item.photos[0])
  const statusNote = item.status === "vendido" ? " (VENDIDO)" : item.status === "reservado" ? " (RESERVADO)" : ""
  const title = `${item.title} — ${formatPrice(item.price)}${statusNote}`
  const description = [
    item.condition,
    item.acceptsOffers ? "Aceito ofertas" : null,
    item.description.slice(0, 140),
  ]
    .filter(Boolean)
    .join(" · ")
  return {
    title,
    description,
    alternates: { canonical: `/itens/${item.slug}` },
    openGraph: {
      title,
      description,
      url: `/itens/${item.slug}`,
      type: "website",
      ...(photo ? { images: [{ url: photo, alt: item.title }] } : {}),
    },
  }
}

export default async function ItemPage(props: PageProps<"/itens/[slug]">) {
  const { slug } = await props.params
  const [item, settings] = await Promise.all([getItemBySlug(slug), getSettings()])
  if (!item) notFound()

  const photos = item.photos.map(photoFullUrl).filter((u): u is string => !!u)
  const url = `${siteUrl()}/itens/${item.slug}`
  const available = item.status === "disponivel"
  const t = settings.t
  const reference = safeHttpsUrl(item.referenceUrl)
  const waMessage = fill(t.whatsappItemMessage, { item: item.title, link: url })

  return (
    <div className="flex flex-col gap-6 py-5 pb-28">
      <TrackView name={item.title} price={item.price} />
      <Link
        href={item.category ? `/itens?cat=${item.category.slug}` : "/itens"}
        className="flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {item.category?.name ?? t.catalogTitle}
      </Link>

      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <Gallery photos={photos} title={item.title} sold={item.status === "vendido"} />

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={item.status} className={available ? "" : "px-4 py-1 text-sm"} />
              <span className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-0.5 text-[11px] font-semibold">
                <Sparkles className="size-3" aria-hidden />
                {item.condition}
              </span>
              {item.acceptsOffers && available && <OffersBadge />}
            </div>
            <h1 className="text-2xl leading-tight font-extrabold text-balance sm:text-3xl">{item.title}</h1>
            <Price price={item.price} originalPrice={item.originalPrice} size="lg" />
            {reference && (
              <a
                href={reference.href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
              >
                <ExternalLink className="size-4" aria-hidden />
                {t.referenceLabel} <span className="text-xs">({reference.host})</span>
              </a>
            )}
          </div>

          {item.dimensions && (
            <p className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm">
              <Ruler className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>
                <span className="font-semibold">Medidas:</span> {item.dimensions}
              </span>
            </p>
          )}

          {item.description && (
            <p className="text-[15px] leading-relaxed whitespace-pre-line text-foreground/85">{item.description}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {available && (
              <WhatsAppButton
                phone={settings.whatsapp}
                itemName={item.title}
                label={t.whatsappButton}
                message={waMessage}
              />
            )}
            <ShareButton title={item.title} url={url} />
          </div>

          <ContactForm
            itemId={item.id}
            itemTitle={item.title}
            status={item.status}
            texts={{
              title: t.contactTitle,
              message: fill(t.contactMessage, { item: item.title }),
              success: t.contactSuccess,
              sold: t.soldMessage,
              reserved: t.reservedMessage,
            }}
          />

          <p className="text-xs text-muted-foreground">
            {fill(t.pickupNote, { local: settings.pickupNeighborhood || settings.pickupCity || "local a combinar" })}{" "}
            <Link href="/retirada" className="font-medium text-primary underline-offset-2 hover:underline">
              Como funciona a retirada
            </Link>
          </p>
        </div>
      </div>

      {available && (
        <WhatsAppButton
          floating
          phone={settings.whatsapp}
          itemName={item.title}
          label="WhatsApp"
          message={waMessage}
          className="md:hidden"
        />
      )}
    </div>
  )
}
