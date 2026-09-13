import "server-only"

import type ClientRepresentation from "@keycloak/keycloak-admin-client/lib/defs/clientRepresentation"
import type ProtocolMapperRepresentation from "@keycloak/keycloak-admin-client/lib/defs/protocolMapperRepresentation"
import type KcAdminClient from "@keycloak/keycloak-admin-client"
import {
  requireClientManager,
  requireClientViewer,
  requireSession,
} from "@/lib/auth/session"
import { canManageClients } from "@/lib/auth/roles"
import { getAdminClient } from "@/lib/keycloak/admin-client"
import { MASTER_REALM } from "@/lib/keycloak/workspace"
import {
  BUILT_IN_CLIENT_IDS,
  CONSOLE_CLIENT_ID,
  SELF_HELP_CLIENT_ID,
  SELF_HELP_TOKEN_CLAIMS,
  type AccessType,
  type AdminClient,
  type ClientDetail,
  type ClientKind,
  type ClientMapper,
  type ClientSessionInfo,
  type ListClientsParams,
} from "@/lib/keycloak/oidc-client-types"

export {
  BUILT_IN_CLIENT_IDS,
  CONSOLE_CLIENT_ID,
  SELF_HELP_CLIENT_ID,
  SELF_HELP_REQUIRED_CLAIMS,
  SELF_HELP_TOKEN_CLAIMS,
} from "@/lib/keycloak/oidc-client-types"
export type {
  AccessType,
  AdminClient,
  ClientDetail,
  ClientKind,
  ClientMapper,
  ClientSessionInfo,
  ListClientsParams,
} from "@/lib/keycloak/oidc-client-types"

function selfHelpProtocolMappers(): ProtocolMapperRepresentation[] {
  return SELF_HELP_TOKEN_CLAIMS.map((mapper) => ({
    name: mapper.name,
    protocol: "openid-connect",
    protocolMapper: "oidc-usermodel-attribute-mapper",
    config: {
      "user.attribute": mapper.attribute,
      "claim.name": mapper.claim,
      "jsonType.label": "String",
      "id.token.claim": "true",
      "access.token.claim": "true",
      "userinfo.token.claim": "true",
      "introspection.token.claim": "true",
    },
  }))
}

const CONSOLE_SERVICE_ROLES = new Set([
  "manage-users",
  "view-users",
  "query-users",
  "view-clients",
  "query-clients",
])

function fineractUiOrigin() {
  return (process.env.FINERACT_UI_URL ?? "").replace(/\/$/, "")
}

async function ensureSelfHelpClientMappers(
  admin: KcAdminClient,
  clientId?: string,
) {
  if (clientId && clientId !== SELF_HELP_CLIENT_ID) return
  const found = await admin.clients.find({ clientId: SELF_HELP_CLIENT_ID })
  const selfHelp = found[0]
  if (!selfHelp?.id) return
  const existing = await admin.clients.listProtocolMappers({ id: selfHelp.id })
  const names = new Set((existing ?? []).map((item) => item.name).filter(Boolean))
  for (const mapper of selfHelpProtocolMappers()) {
    if (!mapper.name || names.has(mapper.name)) continue
    await admin.clients.addProtocolMapper({ id: selfHelp.id }, mapper)
  }
}

async function ensureSelfHelpClient(admin: KcAdminClient) {
  const found = await admin.clients.find({ clientId: SELF_HELP_CLIENT_ID })
  if (!found[0]?.id) {
    await admin.clients.create({
      clientId: SELF_HELP_CLIENT_ID,
      name: "Self Help",
      description: "Public client for the member Self Help app (phone + password).",
      enabled: true,
      publicClient: true,
      protocol: "openid-connect",
      rootUrl: "https://mobile.bankayo.io",
      baseUrl: "https://mobile.bankayo.io",
      redirectUris: ["https://mobile.bankayo.io/*", "http://localhost:*"],
      webOrigins: ["+"],
      standardFlowEnabled: true,
      implicitFlowEnabled: false,
      directAccessGrantsEnabled: true,
      serviceAccountsEnabled: false,
      fullScopeAllowed: true,
      attributes: { "pkce.code.challenge.method": "S256" },
      protocolMappers: selfHelpProtocolMappers(),
    })
  }
  await ensureSelfHelpClientMappers(admin, SELF_HELP_CLIENT_ID)
}

async function ensureConsoleServiceRoles(admin: KcAdminClient, clientUuid: string) {
  const serviceUser = await admin.clients.getServiceAccountUser({ id: clientUuid })
  if (!serviceUser?.id) return
  const [realmManagement] = await admin.clients.find({
    clientId: "realm-management",
  })
  if (!realmManagement?.id) return
  const [available, assigned] = await Promise.all([
    admin.clients.listRoles({ id: realmManagement.id }),
    admin.users.listClientRoleMappings({
      id: serviceUser.id,
      clientUniqueId: realmManagement.id,
    }),
  ])
  const have = new Set((assigned ?? []).map((role) => role.name).filter(Boolean))
  const toAdd = (available ?? []).filter(
    (role): role is typeof role & { id: string; name: string } => {
      if (!role.id || !role.name) return false
      return CONSOLE_SERVICE_ROLES.has(role.name) && !have.has(role.name)
    },
  )
  if (toAdd.length === 0) return
  await admin.users.addClientRoleMappings({
    id: serviceUser.id,
    clientUniqueId: realmManagement.id,
    roles: toAdd.map((role) => ({ id: role.id, name: role.name })),
  })
}

async function ensureKeycloakUiClient(admin: KcAdminClient) {
  const found = await admin.clients.find({ clientId: CONSOLE_CLIENT_ID })
  let client = found[0]
  if (!client?.id) {
    const origin = fineractUiOrigin()
    const redirectUris = ["http://localhost:*"]
    const webOrigins = ["+"]
    if (origin) {
      redirectUris.unshift(`${origin}/*`)
      webOrigins.unshift(origin)
    }
    const { id } = await admin.clients.create({
      clientId: CONSOLE_CLIENT_ID,
      name: "Fineract UI",
      description: "Confidential client for officers to manage Self Help users.",
      enabled: true,
      publicClient: false,
      protocol: "openid-connect",
      secret: process.env.AUTH_KEYCLOAK_SECRET || undefined,
      rootUrl: origin || undefined,
      baseUrl: origin || undefined,
      redirectUris,
      webOrigins,
      standardFlowEnabled: true,
      implicitFlowEnabled: false,
      directAccessGrantsEnabled: false,
      serviceAccountsEnabled: true,
      fullScopeAllowed: true,
      attributes: { "pkce.code.challenge.method": "S256" },
    })
    client = { id, clientId: CONSOLE_CLIENT_ID }
  } else if (
    !client.serviceAccountsEnabled ||
    client.publicClient ||
    client.enabled === false
  ) {
    await admin.clients.update(
      { id: client.id },
      {
        ...client,
        enabled: true,
        publicClient: false,
        serviceAccountsEnabled: true,
      },
    )
  }
  if (client.id) {
    await ensureConsoleServiceRoles(admin, client.id)
  }
}

/** Create self-help + keycloak-ui on a SACCO realm if they are missing. */
export async function ensureWorkspaceOidcClients(admin?: KcAdminClient) {
  const client = admin ?? (await getAdminClient())
  const realm = client.realmName
  if (!realm || realm === MASTER_REALM) return
  await ensureSelfHelpClient(client)
  await ensureKeycloakUiClient(client)
}

function accessType(client: ClientRepresentation): AccessType {
  if (client.bearerOnly) return "bearer-only"
  if (client.publicClient) return "public"
  return "confidential"
}

function isProtectedClientId(clientId: string) {
  return BUILT_IN_CLIENT_IDS.has(clientId) || clientId === CONSOLE_CLIENT_ID
}

function toAdminClient(client: ClientRepresentation): AdminClient {
  const clientId = client.clientId ?? ""
  return {
    id: client.id ?? "",
    clientId,
    name: client.name || clientId,
    description: client.description ?? "",
    protocol: client.protocol ?? "openid-connect",
    enabled: client.enabled !== false,
    accessType: accessType(client),
    publicClient: client.publicClient === true,
    rootUrl: client.rootUrl ?? "",
    baseUrl: client.baseUrl ?? "",
    redirectUris: client.redirectUris ?? [],
    webOrigins: client.webOrigins ?? [],
    standardFlowEnabled: client.standardFlowEnabled === true,
    implicitFlowEnabled: client.implicitFlowEnabled === true,
    directAccessGrantsEnabled: client.directAccessGrantsEnabled === true,
    serviceAccountsEnabled: client.serviceAccountsEnabled === true,
    builtIn: BUILT_IN_CLIENT_IDS.has(clientId),
    protected: isProtectedClientId(clientId),
  }
}

export async function listClients(params: ListClientsParams = {}) {
  const session = await requireClientViewer()
  const client = await getAdminClient()
  const found = await client.clients.find({
    first: 0,
    max: 200,
    clientId: params.search || undefined,
    search: Boolean(params.search),
  })

  await ensureWorkspaceOidcClients(client).catch(() => undefined)

  const kind = params.kind ?? "applications"
  let clients = found.map(toAdminClient)

  if (kind === "applications") {
    clients = clients.filter((item) => !item.builtIn)
  } else if (kind === "built-in") {
    clients = clients.filter((item) => item.builtIn)
  }

  if (params.enabled !== undefined) {
    clients = clients.filter((item) => item.enabled === params.enabled)
  }

  const first = params.first ?? 0
  const max = params.max ?? 50
  return {
    clients: clients.slice(first, first + max),
    total: clients.length,
    canManage: canManageClients(session.roles),
  }
}

function formatEpoch(value?: number) {
  if (!value) return ""
  return new Date(value).toISOString()
}

function toClientMapper(mapper: ProtocolMapperRepresentation): ClientMapper {
  return {
    id: mapper.id ?? mapper.name ?? "",
    name: mapper.name ?? "",
    protocolMapper: mapper.protocolMapper ?? "",
    userAttribute: String(mapper.config?.["user.attribute"] ?? ""),
    claimName: String(mapper.config?.["claim.name"] ?? ""),
  }
}

export async function getClient(id: string) {
  const session = await requireClientViewer()
  const client = await getAdminClient()
  const found = await client.clients.findOne({ id })
  if (!found?.id) return null
  await ensureWorkspaceOidcClients(client).catch(() => undefined)
  return {
    client: toAdminClient(found),
    canManage: canManageClients(session.roles),
  }
}

export async function getClientDetail(id: string): Promise<ClientDetail | null> {
  const session = await requireClientViewer()
  const admin = await getAdminClient()
  const found = await admin.clients.findOne({ id })
  if (!found?.id) return null
  await ensureWorkspaceOidcClients(admin).catch(() => undefined)

  const [mappers, sessions, sessionCount] = await Promise.all([
    admin.clients.listProtocolMappers({ id }).catch(() => []),
    admin.clients.listSessions({ id, max: 25 }).catch(() => []),
    admin.clients.getSessionCount({ id }).catch(() => ({ count: 0 })),
  ])

  return {
    client: toAdminClient(found),
    mappers: (mappers ?? []).map(toClientMapper),
    sessions: (sessions ?? [])
      .map((item) => ({
        id: item.id ?? "",
        username: item.username ?? "",
        ip: item.ipAddress ?? "",
        startedAt: formatEpoch(item.start),
        lastAccess: formatEpoch(item.lastAccess),
      }))
      .filter((item) => item.id),
    sessionCount: sessionCount?.count ?? 0,
    canManage: canManageClients(session.roles),
  }
}

export async function ensureSelfHelpTokenMappers(id: string) {
  await requireClientManager()
  const admin = await getAdminClient()
  const found = await admin.clients.findOne({ id })
  if (!found?.id) throw new Error("Client not found")
  if (found.clientId !== SELF_HELP_CLIENT_ID) {
    throw new Error("Token mappers are only added for the self-help client.")
  }
  await ensureSelfHelpClientMappers(admin, found.clientId)
}

export async function deleteClient(id: string) {
  await requireClientManager()
  const admin = await getAdminClient()
  const found = await admin.clients.findOne({ id })
  if (!found?.id) throw new Error("Client not found")
  const clientId = found.clientId ?? ""
  if (isProtectedClientId(clientId)) {
    throw new Error("Built-in and console clients cannot be deleted.")
  }
  await admin.clients.del({ id })
}

function parseLines(value?: string) {
  return (value ?? "")
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export async function createClient(input: {
  clientId: string
  name?: string
  description?: string
  publicClient?: boolean
  enabled?: boolean
  rootUrl?: string
  redirectUris?: string
  webOrigins?: string
  standardFlowEnabled?: boolean
  directAccessGrantsEnabled?: boolean
  serviceAccountsEnabled?: boolean
}) {
  const clientId = input.clientId.trim()
  if (!clientId) throw new Error("Client ID is required")
  if (BUILT_IN_CLIENT_IDS.has(clientId)) {
    throw new Error("That client ID is reserved for Keycloak.")
  }

  const session = await requireClientManager()
  const client = await getAdminClient()
  const publicClient = input.publicClient ?? false
  const { id } = await client.clients.create({
    clientId,
    name: input.name?.trim() || clientId,
    description: input.description?.trim() || undefined,
    enabled: input.enabled ?? true,
    protocol: "openid-connect",
    publicClient,
    rootUrl: input.rootUrl?.trim() || undefined,
    baseUrl: input.rootUrl?.trim() || undefined,
    redirectUris: parseLines(input.redirectUris),
    webOrigins: parseLines(input.webOrigins),
    standardFlowEnabled: input.standardFlowEnabled ?? true,
    implicitFlowEnabled: false,
    directAccessGrantsEnabled: input.directAccessGrantsEnabled ?? false,
    serviceAccountsEnabled: publicClient
      ? false
      : (input.serviceAccountsEnabled ?? false),
    fullScopeAllowed: true,
    attributes: {
      "pkce.code.challenge.method": "S256",
    },
    protocolMappers:
      clientId === SELF_HELP_CLIENT_ID ? selfHelpProtocolMappers() : undefined,
  })
  if (clientId === SELF_HELP_CLIENT_ID || clientId === CONSOLE_CLIENT_ID) {
    await ensureWorkspaceOidcClients(client)
  }
  return id
}

export async function updateClient(
  id: string,
  input: {
    name?: string
    description?: string
    publicClient?: boolean
    enabled?: boolean
    rootUrl?: string
    redirectUris?: string
    webOrigins?: string
    standardFlowEnabled?: boolean
    directAccessGrantsEnabled?: boolean
    serviceAccountsEnabled?: boolean
  },
) {
  await requireClientManager()
  const session = await requireSession()
  const client = await getAdminClient()
  const current = await client.clients.findOne({ id })
  if (!current?.id) throw new Error("Client not found")

  const clientId = current.clientId ?? ""
  if (
    clientId === CONSOLE_CLIENT_ID &&
    input.enabled === false
  ) {
    throw new Error("The admin console client cannot be disabled.")
  }
  if (clientId === "realm-management" && input.enabled === false) {
    throw new Error("The realm-management client cannot be disabled.")
  }

  const publicClient = input.publicClient ?? current.publicClient === true
  await client.clients.update(
    { id },
    {
      ...current,
      name: input.name ?? current.name,
      description: input.description ?? current.description,
      enabled: input.enabled ?? current.enabled,
      publicClient,
      rootUrl: input.rootUrl ?? current.rootUrl,
      redirectUris:
        input.redirectUris === undefined
          ? current.redirectUris
          : parseLines(input.redirectUris),
      webOrigins:
        input.webOrigins === undefined
          ? current.webOrigins
          : parseLines(input.webOrigins),
      standardFlowEnabled:
        input.standardFlowEnabled ?? current.standardFlowEnabled,
      directAccessGrantsEnabled:
        input.directAccessGrantsEnabled ?? current.directAccessGrantsEnabled,
      serviceAccountsEnabled: publicClient
        ? false
        : (input.serviceAccountsEnabled ?? current.serviceAccountsEnabled),
    },
  )
  await ensureWorkspaceOidcClients(client)
}

export async function setClientEnabled(id: string, enabled: boolean) {
  await updateClient(id, { enabled })
}
