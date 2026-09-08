import type UserRepresentation from "@keycloak/keycloak-admin-client/lib/defs/userRepresentation"

export const SACCO_PARENT_GROUP = "sacco"
export const OPERATOR_USERNAMES = new Set(["console-admin"])

export type UserKind = "self-help" | "operators" | "all"

export type SelfHelpProfile = {
  clientId: string
  saccoId: string
  phone?: string
  displayName?: string
  provisionedAt?: string
  migration?: string
}

export function firstAttribute(
  attributes: Record<string, string[]> | undefined,
  key: string,
): string {
  return attributes?.[key]?.[0]?.trim() ?? ""
}

export function readSelfHelpProfile(
  user: UserRepresentation,
): SelfHelpProfile | null {
  const clientId = firstAttribute(user.attributes, "clientId")
  const saccoId = firstAttribute(user.attributes, "saccoId")
  if (!clientId) return null

  return {
    clientId,
    saccoId,
    phone: firstAttribute(user.attributes, "phone") || undefined,
    displayName: firstAttribute(user.attributes, "displayName") || undefined,
    provisionedAt:
      firstAttribute(user.attributes, "provisioned_at") || undefined,
    migration: firstAttribute(user.attributes, "migration") || undefined,
  }
}

export function isOperatorUsername(username: string) {
  return OPERATOR_USERNAMES.has(username)
}

export function toAttributeMap(profile: {
  clientId: string
  saccoId: string
  phone?: string
  displayName?: string
  provisionedAt?: string
  migration?: string
}): Record<string, string[]> {
  const attributes: Record<string, string[]> = {
    clientId: [profile.clientId],
    fineract_client_id: [profile.clientId],
    saccoId: [profile.saccoId],
  }
  if (profile.phone) attributes.phone = [profile.phone]
  if (profile.displayName) attributes.displayName = [profile.displayName]
  if (profile.provisionedAt) attributes.provisioned_at = [profile.provisionedAt]
  if (profile.migration) attributes.migration = [profile.migration]
  return attributes
}

export function saccoGroupPath(saccoId: string) {
  return `/${SACCO_PARENT_GROUP}/${saccoId}`
}
