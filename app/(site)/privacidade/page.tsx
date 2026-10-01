import type { Metadata } from "next"
import { ChangeCookieChoice } from "@/components/cookie-banner"
import { getSettings } from "@/lib/queries"
import { fill } from "@/lib/site-texts"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  return { title: s.t.privacyTitle }
}

export default async function PrivacyPage() {
  const s = await getSettings()
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 py-8">
      <h1 className="text-2xl font-extrabold sm:text-3xl">{s.t.privacyTitle}</h1>
      <div className="rounded-2xl border bg-card p-5 text-[15px] leading-relaxed whitespace-pre-line">
        {fill(s.t.privacyBody, { site: s.siteTitle })}
      </div>
      <ChangeCookieChoice label={s.t.privacyChangeButton} />
    </div>
  )
}
