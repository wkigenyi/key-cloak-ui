import "server-only"

import KcAdminClient from "@keycloak/keycloak-admin-client"
import { auth } from "@/auth"
import { canViewRealms } from "@/lib/auth/roles"
import { getKeycloakConfig } from "@/lib/keycloak/config"
import { getWorkspaceRealm } from "@/lib/keycloak/workspace"

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

async function resolveAdminToken(userAccessToken: string) {
  const session = await auth()
  if (!canViewRealms(session?.roles ?? [])) return userAccessToken
  try {
    return await getServiceAccountToken()
  } catch {
    return userAccessToken
  }
}

export async function getAdminClient(
  accessToken: string,
  realmName?: string,
) {
  const { url } = getKeycloakConfig()
  const realm = realmName ?? (await getWorkspaceRealm())
  const client = new KcAdminClient({
    baseUrl: url,
    realmName: realm,
  })
  client.setAccessToken(await resolveAdminToken(accessToken))
  return client
}
