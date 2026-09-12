import "server-only"

import KcAdminClient from "@keycloak/keycloak-admin-client"
import { auth } from "@/auth"
import { canViewRealms } from "@/lib/auth/roles"
import { getKeycloakConfig } from "@/lib/keycloak/config"
import { getWorkspaceRealm } from "@/lib/keycloak/workspace"

function decodeExpiry(token: string) {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64url").toString(),
    ) as { exp?: number }
    return typeof payload.exp === "number" ? payload.exp : 0
  } catch {
    return 0
  }
}

async function getServiceAccountToken() {
  const { issuer, clientId, clientSecret } = getKeycloakConfig()
  const response = await fetch(`${issuer}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    signal: AbortSignal.timeout(8_000),
  })
  const body = (await response.json()) as {
    access_token?: string
    error?: string
  }
  if (!response.ok || !body.access_token) {
    throw new Error(body.error || "Service account token failed")
  }
  return body.access_token
}

function serviceAccountTokenProvider() {
  let token = ""
  let expiresAt = 0
  let inflight: Promise<string> | null = null
  return {
    async getAccessToken() {
      const now = Math.ceil(Date.now() / 1000)
      if (token && expiresAt - 30 > now) return token
      if (!inflight) {
        inflight = getServiceAccountToken()
          .then((next) => {
            token = next
            expiresAt = decodeExpiry(next) || now + 60
            return next
          })
          .finally(() => {
            inflight = null
          })
      }
      return inflight
    },
  }
}

const sharedServiceAccount = serviceAccountTokenProvider()

export async function getAdminClient(
  accessToken?: string,
  realmName?: string,
) {
  const { url } = getKeycloakConfig()
  const realm = realmName ?? (await getWorkspaceRealm())
  const client = new KcAdminClient({
    baseUrl: url,
    realmName: realm,
  })
  const session = await auth()
  if (canViewRealms(session?.roles ?? [])) {
    client.registerTokenProvider(sharedServiceAccount)
  } else if (accessToken) {
    client.setAccessToken(accessToken)
  } else {
    throw new Error("No admin credentials available")
  }
  return client
}
