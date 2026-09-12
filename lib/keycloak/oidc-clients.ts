import "server-only"

import type ClientRepresentation from "@keycloak/keycloak-admin-client/lib/defs/clientRepresentation"
import {
  requireClientManager,
  requireClientViewer,
  requireSession,
} from "@/lib/auth/session"
import { canManageClients } from "@/lib/auth/roles"
import { getAdminClient } from "@/lib/keycloak/admin-client"

export const BUILT_IN_CLIENT_IDS = new Set([
  "account",
  "account-console",
  "admin-cli",
  "broker",
  "realm-management",
  "security-admin-console",
])

export const CONSOLE_CLIENT_ID = "keycloak-ui"
export const SELF_HELP_CLIENT_ID = "self-help"

export type ClientKind = "applications" | "built-in" | "all"

export type AccessType = "public" | "confidential" | "bearer-only"

export type AdminClient = {
  id: string
  clientId: string
  name: string
  description: string
  protocol: string
  enabled: boolean
  accessType: AccessType
  publicClient: boolean
  rootUrl: string
  baseUrl: string
  redirectUris: string[]
  webOrigins: string[]
  standardFlowEnabled: boolean
  implicitFlowEnabled: boolean
  directAccessGrantsEnabled: boolean
  serviceAccountsEnabled: boolean
  builtIn: boolean
  protected: boolean
}

export type ListClientsParams = {
  search?: string
  enabled?: boolean
  kind?: ClientKind
  first?: number
  max?: number
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

export async function getClient(id: string) {
  const session = await requireClientViewer()
  const client = await getAdminClient()
  const found = await client.clients.findOne({ id })
  if (!found?.id) return null
  return {
    client: toAdminClient(found),
    canManage: canManageClients(session.roles),
  }
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
  })
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
}

export async function setClientEnabled(id: string, enabled: boolean) {
  await updateClient(id, { enabled })
}
