/** fetch para as rotas /api/admin: envia JSON e lança erro com a mensagem do servidor. */
export async function adminFetch<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    window.location.href = "/login"
    throw new Error("Sessão expirada")
  }
  if (!res.ok) throw new Error(data.error ?? "Algo deu errado. Tente de novo.")
  return data as T
}
