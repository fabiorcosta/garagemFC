import Script from "next/script"

/** GA4: só carrega se NEXT_PUBLIC_GA_MEASUREMENT_ID estiver definido. */
export function Analytics({ nonce }: { nonce?: string }) {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  // O ID vira código JS: só aceita o formato oficial do GA4 (G-XXXXXXXX), nada mais.
  if (!id || !/^G-[A-Z0-9]{4,20}$/.test(id)) return null
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" nonce={nonce} />
      <Script id="ga4" strategy="afterInteractive" nonce={nonce}>
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`}
      </Script>
    </>
  )
}
