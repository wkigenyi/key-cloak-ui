import NextAuth from "next-auth"
import Keycloak from "next-auth/providers/keycloak"
import { extractRoles } from "@/lib/auth/roles"

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
        token.roles = extractRoles(account.access_token)
      }
      // Never persist Keycloak tokens in the session cookie — they overflow
      // Node's header limit (HTTP 431) together with App Router headers.
      delete token.accessToken
      delete token.refreshToken
      delete token.idToken
      delete token.error
      return token
    },
    async session({ session, token }) {
      session.roles = token.roles ?? []
      if (token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
})
