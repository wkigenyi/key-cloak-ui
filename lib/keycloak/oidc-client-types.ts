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

export const SELF_HELP_TOKEN_CLAIMS = [
  { name: "clientId", attribute: "clientId", claim: "clientId" },
  {
    name: "fineract_client_id",
    attribute: "fineract_client_id",
    claim: "fineract_client_id",
  },
  { name: "saccoId", attribute: "saccoId", claim: "saccoId" },
] as const

export const SELF_HELP_REQUIRED_CLAIMS = SELF_HELP_TOKEN_CLAIMS.map(
  (item) => item.claim,
)

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

export type ClientMapper = {
  id: string
  name: string
  protocolMapper: string
  userAttribute: string
  claimName: string
}

export type ClientSessionInfo = {
  id: string
  username: string
  ip: string
  startedAt: string
  lastAccess: string
}

export type ClientDetail = {
  client: AdminClient
  mappers: ClientMapper[]
  sessions: ClientSessionInfo[]
  sessionCount: number
  canManage: boolean
}
