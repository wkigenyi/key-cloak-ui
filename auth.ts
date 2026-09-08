import NextAuth from "next-auth"
import Keycloak from "next-auth/providers/keycloak"
import { extractRoles } from "@/lib/auth/roles"
import { getKeycloakConfig } from "@/lib/keycloak/config"

async function refreshAccessToken(token: {
  refreshToken?: string
  accessToken?: string
  expiresAt?: number
  roles?: string[]
}) {
  const { issuer, clientId, clientSecret } = getKeycloakConfig()
  const response = await fetch(`${issuer}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken ?? "",
    }),
  })

  const refreshed = (await response.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    error?: string
  }

  if (!response.ok || !refreshed.access_token) {
    return { ...token, error: "RefreshTokenError" as const }
  }

  return {
    ...token,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? token.refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + (refreshed.expires_in ?? 300),
    roles: extractRoles(refreshed.access_token),
    error: undefined,
  }
}

const keycloakIssuer = (
  process.env.AUTH_KEYCLOAK_ISSUER ?? "http://127.0.0.1:8080/realms/master"
).replace(/\/$/, "")

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  debug: false,
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
      issuer: keycloakIssuer,
      wellKnown: `${keycloakIssuer}/.well-known/openid-configuration`,
      authorization: `${keycloakIssuer}/protocol/openid-connect/auth`,
      token: `${keycloakIssuer}/protocol/openid-connect/token`,
      userinfo: `${keycloakIssuer}/protocol/openid-connect/userinfo`,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        token.roles = extractRoles(account.access_token)
        return token
      }

      if (
        token.expiresAt &&
        Date.now() < token.expiresAt * 1000 - 15_000
      ) {
        return token
      }

      if (!token.refreshToken) {
        return { ...token, error: "RefreshTokenError" as const }
      }

      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      session.roles = token.roles ?? []
      session.error = token.error
      if (token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
})
