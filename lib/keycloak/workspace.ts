import "server-only"

import { cookies } from "next/headers"
import { auth } from "@/auth"
import { canViewRealms } from "@/lib/auth/roles"
import { getKeycloakConfig } from "@/lib/keycloak/config"

export const WORKSPACE_COOKIE = "kc-realm"
export const MASTER_REALM = "master"

const REALM_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,254}$/

export function defaultWorkspaceRealm() {
  return getKeycloakConfig().realm
}

export function isValidRealmName(value: string) {
  return REALM_NAME.test(value)
}

export function isProtectedRealm(realm: string) {
  return realm === MASTER_REALM || realm === defaultWorkspaceRealm()
}

export async function getWorkspaceRealm() {
  const store = await cookies()
  const fallback = defaultWorkspaceRealm()
  const value = store.get(WORKSPACE_COOKIE)?.value
  if (!value || !isValidRealmName(value)) return fallback
  if (value === fallback) return value
  const session = await auth()
  if (!canViewRealms(session?.roles ?? [])) return fallback
  return value
}

export async function setWorkspaceRealmCookie(realm: string) {
  if (!isValidRealmName(realm)) {
    throw new Error("Invalid realm name")
  }
  const store = await cookies()
  store.set(WORKSPACE_COOKIE, realm, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
  })
}
