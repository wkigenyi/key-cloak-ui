import "server-only"

import type KcAdminClient from "@keycloak/keycloak-admin-client"
import type UserRepresentation from "@keycloak/keycloak-admin-client/lib/defs/userRepresentation"
import { requireSession, requireUserManager, requireUserViewer } from "@/lib/auth/session"
import { canManageUsers } from "@/lib/auth/roles"
import { getAdminClient } from "@/lib/keycloak/admin-client"
import { getKeycloakConfig } from "@/lib/keycloak/config"
import { toActionError } from "@/lib/keycloak/errors"
import { ensureSelfHelpUserProfile } from "@/lib/keycloak/realms"
import { MASTER_REALM, getWorkspaceRealm } from "@/lib/keycloak/workspace"
import {
  normalizeImportEmail,
  sanitizeImportUsername,
} from "@/lib/import/user-file"
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
  requiredActions: string[]
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
    requiredActions: user.requiredActions ?? [],
  }
}

const USER_LIST_PAGE = 100
const USER_LIST_CAP = 2000

function mergeUsers(
  ...lists: Array<UserRepresentation[] | UserRepresentation | undefined>
) {
  const byId = new Map<string, UserRepresentation>()
  for (const list of lists) {
    const items = Array.isArray(list) ? list : list ? [list] : []
    for (const user of items) {
      if (user.id) byId.set(user.id, user)
    }
  }
  return [...byId.values()]
}

async function findWorkspaceUsers(
  client: KcAdminClient,
  params: Pick<ListUsersParams, "search" | "enabled">,
) {
  const found: UserRepresentation[] = []
  let first = 0
  while (first < USER_LIST_CAP) {
    const batch = await client.users.find({
      first,
      max: USER_LIST_PAGE,
      search: params.search || undefined,
      enabled: params.enabled,
      briefRepresentation: false,
    })
    found.push(...batch)
    if (batch.length < USER_LIST_PAGE) break
    first += USER_LIST_PAGE
  }

  const query = params.search?.trim()
  if (!query) return found

  const extra = await Promise.all([
    client.users.find({
      email: query,
      exact: true,
      max: 20,
      briefRepresentation: false,
    }),
    client.users.find({
      username: query,
      exact: true,
      max: 20,
      briefRepresentation: false,
    }),
    client.users.find({
      q: `clientId:${query}`,
      max: 20,
      briefRepresentation: false,
    }),
    client.users.find({
      q: `fineract_client_id:${query}`,
      max: 20,
      briefRepresentation: false,
    }),
  ])
  return mergeUsers(found, ...extra)
}

export async function listUsers(params: ListUsersParams = {}) {
  const session = await requireUserViewer()
  const client = await getAdminClient()
  const found = await findWorkspaceUsers(client, params)

  const kind = params.kind ?? "self-help"
  let users = found.map(toAdminUser)

  if (kind === "self-help") {
    users = users.filter((user) => user.kind === "self-help")
  } else if (kind === "operators") {
    users = users.filter((user) => user.kind === "operator")
  }

  const first = params.first ?? 0
  const page =
    params.max == null ? users : users.slice(first, first + params.max)

  return {
    users: page,
    total: users.length,
    canManage: canManageUsers(session.roles),
  }
}

export type UserSessionInfo = {
  id: string
  ip: string
  startedAt: string
  lastAccess: string
  clients: string[]
}

export type UserCredentialInfo = {
  id: string
  type: string
  label: string
  createdAt: string
}

export type UserActivityInfo = {
  id: string
  type: string
  time: string
  ip: string
  error?: string
}

export type UserDetail = {
  user: AdminUser
  createdAt: string
  sessions: UserSessionInfo[]
  credentials: UserCredentialInfo[]
  activity: UserActivityInfo[]
  canManage: boolean
}

function formatEpoch(value?: number) {
  if (!value) return ""
  return new Date(value).toISOString()
}

export async function getUser(id: string) {
  const session = await requireUserViewer()
  const client = await getAdminClient()
  const user = await client.users.findOne({ id })
  if (!user?.id) return null
  return {
    user: toAdminUser(user),
    canManage: canManageUsers(session.roles),
  }
}

export async function getUserDetail(id: string): Promise<UserDetail | null> {
  const session = await requireUserViewer()
  const client = await getAdminClient()
  const realm = await getWorkspaceRealm()
  const found = await client.users.findOne({ id })
  if (!found?.id) return null
  await ensureSelfHelpUserProfile(realm)

  const [sessions, credentials, events] = await Promise.all([
    client.users.listSessions({ id }).catch(() => []),
    client.users.getCredentials({ id }).catch(() => []),
    client.realms
      .findEvents({ realm, user: id, max: 25 })
      .catch(() => []),
  ])

  const mappedSessions = (sessions ?? []).map((item) => ({
    id: item.id ?? "",
    ip: item.ipAddress ?? "",
    startedAt: formatEpoch(item.start),
    lastAccess: formatEpoch(item.lastAccess),
    clients: Object.values(item.clients ?? {}),
  })).filter((item) => item.id)

  const latestAccess = mappedSessions
    .map((item) => item.lastAccess)
    .filter(Boolean)
    .sort()
    .at(-1)

  const user = toAdminUser(found)
  user.lastLogin = latestAccess ?? ""

  return {
    user,
    createdAt: formatEpoch(found.createdTimestamp),
    sessions: mappedSessions,
    credentials: (credentials ?? []).map((item) => ({
      id: item.id ?? item.type ?? "",
      type: item.type ?? "unknown",
      label: item.userLabel || item.type || "Credential",
      createdAt: formatEpoch(item.createdDate),
    })),
    activity: (events ?? []).map((event, index) => ({
      id: `${event.time ?? index}-${event.type ?? "event"}`,
      type: event.type ?? "EVENT",
      time: formatEpoch(event.time),
      ip: event.ipAddress ?? "",
      error: event.error || undefined,
    })),
    canManage: canManageUsers(session.roles),
  }
}

export async function logoutUserSessions(id: string) {
  await requireUserManager()
  const client = await getAdminClient()
  await client.users.logout({ id })
}

export async function logoutUserSession(id: string, sessionId: string) {
  await requireUserManager()
  const client = await getAdminClient()
  const sessions = await client.users.listSessions({ id })
  if (!sessions.some((session) => session.id === sessionId)) {
    throw new Error("Session not found for this user")
  }
  const realm = await getWorkspaceRealm()
  const token = await client.getAccessToken()
  if (!token) throw new Error("Could not sign the admin request")
  const { url } = getKeycloakConfig()
  const response = await fetch(
    `${url}/admin/realms/${encodeURIComponent(realm)}/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  if (!response.ok && response.status !== 204) {
    throw new Error(`Could not revoke session (${response.status})`)
  }
}

export async function deleteUser(id: string) {
  await requireUserManager()
  const client = await getAdminClient()
  const current = await client.users.findOne({ id })
  if (!current) throw new Error("User not found")
  if (isOperatorUsername(current.username ?? "")) {
    throw new Error("Operator accounts cannot be deleted from this console.")
  }
  await client.users.del({ id })
}

export async function createUser(input: {
  username: string
  email?: string
  firstName?: string
  lastName?: string
  enabled?: boolean
  emailVerified?: boolean
  password: string
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
  if (!input.password) {
    throw new Error("Password is required")
  }

  const session = await requireUserManager()
  const client = await getAdminClient()
  const saccoId = await getWorkspaceRealm()
  await ensureSelfHelpUserProfile(saccoId)
  const displayName =
    [input.firstName, input.lastName].filter(Boolean).join(" ") || input.username
  const email = input.email || undefined
  const attributes = toAttributeMap({
    clientId: input.clientId.trim(),
    saccoId,
    phone: input.phone?.trim() || undefined,
    displayName,
    provisionedAt: new Date().toISOString(),
  })

  try {
    const { id } = await client.users.create({
      username: input.username,
      email,
      firstName: input.firstName || undefined,
      lastName: input.lastName || undefined,
      enabled: input.enabled ?? true,
      emailVerified: Boolean(email && input.emailVerified),
      attributes,
      requiredActions: input.temporaryPassword ? ["UPDATE_PASSWORD"] : [],
      credentials: [
        {
          type: "password",
          value: input.password,
          temporary: Boolean(input.temporaryPassword),
        },
      ],
    })
    const created = await client.users.findOne({ id })
    if (created && !readSelfHelpProfile(created)) {
      await client.users.update(
        { id },
        { ...created, attributes: { ...created.attributes, ...attributes } },
      )
    }
    return id
  } catch (error) {
    throw toActionError(error, "Could not create user")
  }
}

function normalizeUsername(value: string) {
  const username = sanitizeImportUsername(value)
  if (!username) {
    throw new Error("Username is required")
  }
  if (isOperatorUsername(username)) {
    throw new Error("That username is reserved for console operators.")
  }
  return username
}

async function allowUsernameEdits(client: KcAdminClient) {
  const realm = await getWorkspaceRealm()
  const current = await client.realms.findOne({ realm })
  if (!current?.realm || current.editUsernameAllowed) return
  await client.realms.update(
    { realm },
    { ...current, editUsernameAllowed: true },
  )
}

export async function updateUser(
  id: string,
  input: {
    username?: string
    email?: string
    firstName?: string
    lastName?: string
    enabled?: boolean
    emailVerified?: boolean
    clientId?: string
    phone?: string
  },
) {
  await requireUserManager()
  const session = await requireSession()
  const client = await getAdminClient()
  const current = await client.users.findOne({ id })
  if (!current) {
    throw new Error("User not found")
  }
  const currentUsername = current.username ?? ""
  if (isOperatorUsername(currentUsername) && input.clientId) {
    throw new Error("Operators cannot be converted into self-help users.")
  }
  if (isOperatorUsername(currentUsername) && input.username) {
    throw new Error("Operator usernames cannot be changed.")
  }

  const nextUsername = input.username
    ? normalizeUsername(input.username)
    : currentUsername
  const usernameChanged =
    Boolean(nextUsername) && !sameUsername(currentUsername, nextUsername)

  if (usernameChanged) {
    await allowUsernameEdits(client)
  }

  const currentProfile = readSelfHelpProfile(current)
  const nextClientId = (input.clientId ?? currentProfile?.clientId ?? "").trim()
  const nextSaccoId = await getWorkspaceRealm()
  const nextPhone = (input.phone ?? currentProfile?.phone ?? "").trim()
  const firstName = input.firstName ?? current.firstName
  const lastName = input.lastName ?? current.lastName
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") || nextUsername || ""

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

  const nextEmail = input.email !== undefined ? input.email || undefined : current.email
  const emailVerified =
    input.emailVerified === undefined
      ? current.emailVerified
      : Boolean(nextEmail && input.emailVerified)

  try {
    await client.users.update(
      { id },
      {
        ...current,
        username: nextUsername || currentUsername,
        email: nextEmail,
        firstName,
        lastName,
        enabled: input.enabled ?? current.enabled,
        emailVerified,
        attributes,
      },
    )
  } catch (error) {
    throw toActionError(error, "Could not update user")
  }

  if (usernameChanged) {
    const updated = await client.users.findOne({ id })
    if (!sameUsername(updated?.username, nextUsername)) {
      throw new Error(
        "Keycloak did not change the username. Enable Edit username in Realm settings → Login.",
      )
    }
  }
}

export async function setUserEnabled(id: string, enabled: boolean) {
  await updateUser(id, { enabled })
}

export async function clearUserRequiredActions(id: string) {
  await requireUserManager()
  const client = await getAdminClient()
  const current = await client.users.findOne({ id })
  if (!current) {
    throw new Error("User not found")
  }
  try {
    await client.users.update({ id }, { ...current, requiredActions: [] })
  } catch (error) {
    throw toActionError(error, "Could not clear required actions")
  }
}

export async function resetUserPassword(
  id: string,
  password: string,
  temporary = false,
) {
  await requireUserManager()
  const client = await getAdminClient()
  try {
    await client.users.resetPassword({
      id,
      credential: {
        type: "password",
        value: password,
        temporary,
      },
    })
  } catch (error) {
    throw toActionError(error, "Could not reset password")
  }
}

export type ImportUserRow = {
  username: string
  clientId: string
  password?: string
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
  externalId?: string
  rowNumber?: number
}

function isTransientAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /refresh token|401|Unauthorized|invalid_token|Token is not active|Service account token failed/i.test(
    message,
  )
}

export type ImportUserResult = {
  username: string
  status: "created" | "updated" | "skipped"
  reason?: string
  profile?: boolean
  password?: boolean
  email?: boolean
}

function sameUsername(found: string | undefined, username: string) {
  const value = found ?? ""
  return (
    value === username ||
    value === `+${username}` ||
    sanitizeImportUsername(value) === username
  )
}

async function findUserByUsername(client: KcAdminClient, username: string) {
  const matches = await client.users.find({ username, exact: true, max: 5 })
  const exact = matches.find((user) => sameUsername(user.username, username))
  if (exact) return exact
  if (!/^\d+$/.test(username)) return undefined
  const plusMatches = await client.users.find({
    username: `+${username}`,
    exact: true,
    max: 5,
  })
  return plusMatches.find((user) => sameUsername(user.username, username))
}

async function findUserByClientId(client: KcAdminClient, clientId: string) {
  const found = await client.users.find({
    q: `clientId:${clientId}`,
    max: 20,
  })
  return found.find(
    (user) => readSelfHelpProfile(user)?.clientId === clientId,
  )
}

async function findImportedUser(
  client: KcAdminClient,
  username: string,
  clientId: string,
): Promise<
  | { user: UserRepresentation; conflict: true }
  | { user: UserRepresentation | undefined; conflict: false }
> {
  const [byClientId, byUsername] = await Promise.all([
    findUserByClientId(client, clientId),
    findUserByUsername(client, username),
  ])
  if (byClientId) return { user: byClientId, conflict: false }

  if (!byUsername) return { user: undefined, conflict: false }

  const existingClientId = readSelfHelpProfile(byUsername)?.clientId
  if (existingClientId && existingClientId !== clientId) {
    return { user: byUsername, conflict: true }
  }
  return { user: byUsername, conflict: false }
}

async function importOneUser(
  client: KcAdminClient,
  row: {
    username: string
    clientId: string
    password: string
    email?: string
    firstName?: string
    lastName?: string
    phone?: string
    externalId?: string
    realm: string
  },
) {
  const { user: existing, conflict } = await findImportedUser(
    client,
    row.username,
    row.clientId,
  )
  if (conflict) {
    throw new Error(
      `Username is already used by client ${readSelfHelpProfile(existing)?.clientId}`,
    )
  }
  const email = normalizeImportEmail(row.email)
  const phone = row.phone?.trim() || undefined
  const displayName =
    [row.firstName, row.lastName].filter(Boolean).join(" ") || row.username
  const attributes = toAttributeMap({
    clientId: row.clientId,
    saccoId: row.realm,
    phone,
    externalId: row.externalId || undefined,
    displayName,
    provisionedAt: new Date().toISOString(),
    migration: "file-import",
  })

  if (!existing?.id) {
    await client.users.create({
      username: row.username,
      email,
      firstName: row.firstName || undefined,
      lastName: row.lastName || undefined,
      enabled: true,
      emailVerified: Boolean(email),
      attributes,
      credentials: [{ type: "password", value: row.password, temporary: false }],
    })
    return {
      status: "created" as const,
      profile: true,
      password: true,
      email: Boolean(email),
    }
  }

  await client.users.update(
    { id: existing.id },
    {
      ...existing,
      email: email ?? existing.email,
      firstName: row.firstName || existing.firstName,
      lastName: row.lastName || existing.lastName,
      emailVerified: email ? true : existing.emailVerified,
      enabled: true,
      attributes: { ...existing.attributes, ...attributes },
    },
  )
  await client.users.resetPassword({
    id: existing.id,
    credential: {
      type: "password",
      value: row.password,
      temporary: false,
    },
  })
  return {
    status: "updated" as const,
    profile: true,
    password: true,
    email: Boolean(email),
  }
}

export async function importSelfHelpUsers(rows: ImportUserRow[]) {
  if (rows.length > 50) {
    throw new Error("Import at most 50 users per request.")
  }

  const session = await requireUserManager()
  const realm = await getWorkspaceRealm()
  if (realm === MASTER_REALM) {
    throw new Error("Do not import self-help users into master.")
  }

  let client = await getAdminClient()
  await ensureSelfHelpUserProfile(realm)
  const results: ImportUserResult[] = []
  let created = 0
  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const username = sanitizeImportUsername(row.username)
    const clientId = row.clientId.trim()
    const externalId = row.externalId?.trim() || ""
    const password = row.password?.trim() || externalId
    const label = username || row.username.trim() || `Row ${row.rowNumber ?? "?"}`
    if (!username) {
      skipped += 1
      results.push({
        username: label,
        status: "skipped",
        reason: "Phone or email is required",
        profile: false,
        password: false,
        email: false,
      })
      continue
    }
    if (!clientId) {
      skipped += 1
      results.push({
        username: label,
        status: "skipped",
        reason: "clientId is required",
        profile: false,
        password: false,
        email: false,
      })
      continue
    }
    if (!externalId) {
      skipped += 1
      results.push({
        username: label,
        status: "skipped",
        reason: "externalId is required",
        profile: false,
        password: false,
        email: false,
      })
      continue
    }
    if (!password) {
      skipped += 1
      results.push({
        username: label,
        status: "skipped",
        reason: "Password is required",
        profile: false,
        password: false,
        email: false,
      })
      continue
    }
    if (isOperatorUsername(username)) {
      skipped += 1
      results.push({
        username,
        status: "skipped",
        reason: "Reserved operator username",
        profile: false,
        password: false,
        email: false,
      })
      continue
    }

    try {
      const imported = await importOneUser(client, {
        username,
        clientId,
        password,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone,
        externalId,
        realm,
      })
      if (imported.status === "created") created += 1
      else updated += 1
      results.push({ username, ...imported })
    } catch (error) {
      if (isTransientAuthError(error)) {
        try {
          client = await getAdminClient()
          const imported = await importOneUser(client, {
            username,
            clientId,
            password,
            email: row.email,
            firstName: row.firstName,
            lastName: row.lastName,
            phone: row.phone,
            externalId,
            realm,
          })
          if (imported.status === "created") created += 1
          else updated += 1
          results.push({ username, ...imported })
          continue
        } catch (retryError) {
          skipped += 1
          results.push({
            username,
            status: "skipped",
            reason:
              retryError instanceof Error
                ? retryError.message
                : "Import failed",
            profile: false,
            password: false,
            email: false,
          })
          continue
        }
      }
      skipped += 1
      results.push({
        username,
        status: "skipped",
        reason: error instanceof Error ? error.message : "Import failed",
        profile: false,
        password: false,
        email: false,
      })
    }
  }

  return { results, created, updated, skipped, realm }
}
