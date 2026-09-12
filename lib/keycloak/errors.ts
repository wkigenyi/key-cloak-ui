import "server-only"

function isNextControlError(error: unknown) {
  const digest =
    error && typeof error === "object" && "digest" in error
      ? String((error as { digest?: unknown }).digest)
      : ""
  return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND")
}

function responseDataMessage(data: unknown) {
  if (typeof data === "string" && data.trim()) return data.trim()
  if (!data || typeof data !== "object") return ""
  const record = data as Record<string, unknown>
  for (const key of ["errorMessage", "error_description", "error"]) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

/** Plain Error safe to throw from a server action (Keycloak NetworkError is not). */
export function toActionError(error: unknown, fallback: string): Error {
  if (isNextControlError(error)) throw error
  if (error instanceof Error) {
    const fromBody = responseDataMessage(
      (error as { responseData?: unknown }).responseData,
    )
    const message = fromBody && fromBody !== error.message
      ? `${error.message}: ${fromBody}`
      : error.message || fallback
    return new Error(message)
  }
  return new Error(fallback)
}

export async function withActionError<T>(
  work: () => Promise<T>,
  fallback: string,
): Promise<T> {
  try {
    return await work()
  } catch (error) {
    throw toActionError(error, fallback)
  }
}

export type ActionResult<T = void> =
  | ({ ok: true } & T)
  | { ok: false; error: string }

export async function asActionResult<T>(
  work: () => Promise<T>,
  fallback: string,
): Promise<ActionResult<T>> {
  try {
    const data = await work()
    return { ok: true, ...(data as T) }
  } catch (error) {
    if (isNextControlError(error)) throw error
    return { ok: false, error: toActionError(error, fallback).message }
  }
}
