import "server-only"

import type UserRepresentation from "@keycloak/keycloak-admin-client/lib/defs/userRepresentation"
import { requireSession, requireUserManager, requireUserViewer } from "@/lib/auth/session"
import { canManageUsers } from "@/lib/auth/roles"
import { getAdminClient } from "@/lib/keycloak/admin-client"
import { getWorkspaceRealm } from "@/lib/keycloak/workspace"
import {
  isOperatorUsername,
  readSelfHelpProfile,
  toAttributeMap,
  type UserKind,
} from "@/lib/keycloak/self-help"

export type AdminUser = {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  enabled: boolean
  emailVerified: boolean
  clientId: string
  saccoId: string
  phone: string
  displayName: string
  kind: "self-help" | "operator"
  lastLogin: string
}

export type ListUsersParams = {
  search?: string
  enabled?: boolean
  first?: number
  max?: number
  kind?: UserKind
}

function toAdminUser(user: UserRepresentation): AdminUser {
  const profile = readSelfHelpProfile(user)
  const username = user.username ?? ""
  return {
    id: user.id ?? "",
    username,
    email: user.email ?? "",
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    enabled: user.enabled !== false,
    emailVerified: user.emailVerified === true,
    clientId: profile?.clientId ?? "",
    saccoId: profile?.saccoId ?? "",
    phone: profile?.phone ?? "",
    displayName: profile?.displayName ?? "",
    kind:
      profile?.clientId && !isOperatorUsername(username)
        ? "self-help"
        : "operator",
    lastLogin: "",
  }
}

export async function listUsers(params: ListUsersParams = {}) {
  const session = await requireUserViewer()
  const client = await getAdminClient(session.accessToken!)
  const found = await client.users.find({
    first: 0,
    max: 200,
    search: params.search || undefined,
    enabled: params.enabled,
    briefRepresentation: false,
  })

  const kind = params.kind ?? "self-help"
  let users = found.map(toAdminUser)

  if (kind === "self-help") {
    users = users.filter((user) => user.kind === "self-help")
  } else   if (kind === "operators") {
    users = users.filter((user) => user.kind === "operator")
  }

  const first = params.first ?? 0
  const max = params.max ?? 50
  const page = users.slice(first, first + max)

  return {
    users: page,
    total: users.length,
    canManage: canManageUsers(session.roles),
  }
}

export async function getUser(id: string) {
  const session = await requireUserViewer()
  const client = await getAdminClient(session.accessToken!)
  const user = await client.users.findOne({ id })
  if (!user?.id) return null
  return {
    user: toAdminUser(user),
    canManage: canManageUsers(session.roles),
  }
}

export async function createUser(input: {
  username: string
  email?: string
  firstName?: string
  lastName?: string
  enabled?: boolean
  password?: string
  temporaryPassword?: boolean
  clientId: string
  phone?: string
}) {
  if (isOperatorUsername(input.username)) {
    throw new Error("That username is reserved for console operators.")
  }
  if (!input.clientId.trim()) {
    throw new Error("clientId is required for self-help users.")
  }

  const session = await requireUserManager()
  const client = await getAdminClient(session.accessToken!)
  const saccoId = await getWorkspaceRealm()
  const displayName =
    [input.firstName, input.lastName].filter(Boolean).join(" ") || input.username

  const { id } = await client.users.create({
    username: input.username,
    email: input.email || undefined,
    firstName: input.firstName || undefined,
    lastName: input.lastName || undefined,
    enabled: input.enabled ?? true,
    emailVerified: false,
    attributes: toAttributeMap({
      clientId: input.clientId.trim(),
      saccoId,
      phone: input.phone?.trim() || undefined,
      displayName,
      provisionedAt: new Date().toISOString(),
    }),
    credentials: input.password
      ? [
          {
            type: "password",
            value: input.password,
            temporary: input.temporaryPassword ?? true,
          },
        ]
      : undefined,
  })

  return id
}

export async function updateUser(
  id: string,
  input: {
    email?: string
    firstName?: string
    lastName?: string
    enabled?: boolean
    clientId?: string
    phone?: string
  },
) {
  await requireUserManager()
  const session = await requireSession()
  const client = await getAdminClient(session.accessToken!)
  const current = await client.users.findOne({ id })
  if (!current) {
    throw new Error("User not found")
  }
  if (isOperatorUsername(current.username ?? "") && input.clientId) {
    throw new Error("Operators cannot be converted into self-help users.")
  }

  const currentProfile = readSelfHelpProfile(current)
  const nextClientId = (input.clientId ?? currentProfile?.clientId ?? "").trim()
  const nextSaccoId = await getWorkspaceRealm()
  const nextPhone = (input.phone ?? currentProfile?.phone ?? "").trim()
  const firstName = input.firstName ?? current.firstName
  const lastName = input.lastName ?? current.lastName
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") || current.username || ""

  const attributes = nextClientId
    ? {
        ...current.attributes,
        ...toAttributeMap({
          clientId: nextClientId,
          saccoId: nextSaccoId,
          phone: nextPhone || undefined,
          displayName,
          provisionedAt: currentProfile?.provisionedAt,
          migration: currentProfile?.migration,
        }),
      }
    : current.attributes

  await client.users.update(
    { id },
    {
      ...current,
      email: input.email ?? current.email,
      firstName,
      lastName,
      enabled: input.enabled ?? current.enabled,
      attributes,
    },
  )
}

export async function setUserEnabled(id: string, enabled: boolean) {
  await updateUser(id, { enabled })
}

export async function resetUserPassword(
  id: string,
  password: string,
  temporary = true,
) {
  const session = await requireUserManager()
  const client = await getAdminClient(session.accessToken!)
  await client.users.resetPassword({
    id,
    credential: {
      type: "password",
      value: password,
      temporary,
    },
  })
}

export type { UserRepresentation }
