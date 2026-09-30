import { NextResponse, type NextRequest } from "next/server"

/**
 * CSP com nonce novo a cada requisição de página.
 *  - script-src: só scripts com o nonce desta resposta ('strict-dynamic' propaga para o que eles carregarem).
 *  - style-src 'unsafe-inline': next/image (fill) e sonner usam atributo style, que nonce não cobre.
 *    Risco aceito: exige injeção de HTML, que o React já impede.
 *  - connect-src: só o próprio site, o bucket de fotos (PUT assinado) e o GA quando ativo.
 *  - frame-ancestors 'none': ninguém exibe o site dentro de outro (clickjacking do admin).
 */
function origin(url: string | undefined) {
  if (!url) return null
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

function buildCsp(nonce: string) {
  const isDev = process.env.NODE_ENV === "development"
  const photos = origin(process.env.NEXT_PUBLIC_S3_PUBLIC_URL)
  const bucketHost = origin(process.env.S3_ENDPOINT)?.replace(/^https:\/\//, "")
  const ga = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    ? ["https://*.googletagmanager.com", "https://*.google-analytics.com", "https://*.analytics.google.com"]
    : []

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:", ...(photos ? [photos] : []), ...ga],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(bucketHost ? [`https://${bucketHost}`, `https://*.${bucketHost}`] : []), ...ga],
    "frame-src": ["'none'"],
    "worker-src": ["'none'"],
    "manifest-src": ["'self'"],
    "media-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  }
  const csp = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`)
  if (!isDev) csp.push("upgrade-insecure-requests")
  return csp.join("; ")
}

export function proxy(request: NextRequest) {
  // Produção: páginas só no domínio oficial (o endereço *.up.railway.app redireciona)
  const canonical = process.env.NODE_ENV === "production" ? origin(process.env.AUTH_URL) : null
  if (canonical && request.headers.get("host") !== new URL(canonical).host) {
    return NextResponse.redirect(new URL(request.nextUrl.pathname + request.nextUrl.search, canonical), 308)
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const csp = buildCsp(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("Content-Security-Policy", csp)
  return response
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|opengraph-image).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}
