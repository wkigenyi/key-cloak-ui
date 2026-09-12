export const USER_ADMIN_ROLES = [
  "manage-users",
  "view-users",
  "query-users",
] as const

export const CLIENT_ADMIN_ROLES = [
  "manage-clients",
  "view-clients",
  "query-clients",
] as const

const STORED_ROLES = new Set<string>([
  "admin",
  ...USER_ADMIN_ROLES,
  ...CLIENT_ADMIN_ROLES,
  "view-realm",
  "create-realm",
  "manage-realm",
])

export function extractRoles(accessToken: string): string[] {
  const payload = decodeJwtPayload(accessToken)
  if (!payload) return []

  const realmRoles = payload.realm_access?.roles ?? []
  const realmManagement =
    payload.resource_access?.["realm-management"]?.roles ?? []

  return [...new Set([...realmRoles, ...realmManagement])].filter((role) =>
    STORED_ROLES.has(role),
  )
}

export function isRealmAdmin(roles: string[]): boolean {
  return roles.includes("admin")
}

export function canViewUsers(roles: string[]): boolean {
  return (
    isRealmAdmin(roles) ||
    roles.some((role) =>
      (USER_ADMIN_ROLES as readonly string[]).includes(role),
    )
  )
}

export function canManageUsers(roles: string[]): boolean {
  return isRealmAdmin(roles) || roles.includes("manage-users")
}

export function canViewClients(roles: string[]): boolean {
  return (
    isRealmAdmin(roles) ||
    roles.some((role) =>
      (CLIENT_ADMIN_ROLES as readonly string[]).includes(role),
    )
  )
}

export function canManageClients(roles: string[]): boolean {
  return isRealmAdmin(roles) || roles.includes("manage-clients")
}

export function canViewRealms(roles: string[]): boolean {
  return (
    isRealmAdmin(roles) ||
    roles.includes("view-realm") ||
    roles.includes("create-realm") ||
    roles.includes("manage-realm")
  )
}

export function canManageRealm(roles: string[]): boolean {
  return isRealmAdmin(roles) || roles.includes("manage-realm")
}

export function canCreateRealm(roles: string[]): boolean {
  return isRealmAdmin(roles) || roles.includes("create-realm")
}

export function canDeleteRealm(roles: string[]): boolean {
  return canManageRealm(roles)
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".")
  if (parts.length < 2) return null

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as JwtPayload
  } catch {
    return null
  }
}

type JwtPayload = {
  realm_access?: { roles?: string[] }
  resource_access?: Record<string, { roles?: string[] }>
}
