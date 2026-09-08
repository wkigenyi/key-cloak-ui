import "server-only"

import type RealmRepresentation from "@keycloak/keycloak-admin-client/lib/defs/realmRepresentation"
import type { RealmEventsConfigRepresentation } from "@keycloak/keycloak-admin-client/lib/defs/realmEventsConfigRepresentation"
import type { KeyMetadataRepresentation } from "@keycloak/keycloak-admin-client/lib/defs/keyMetadataRepresentation"
import type { UserProfileConfig } from "@keycloak/keycloak-admin-client/lib/defs/userProfileMetadata"
import type ClientPoliciesRepresentation from "@keycloak/keycloak-admin-client/lib/defs/clientPoliciesRepresentation"
import type ClientProfilesRepresentation from "@keycloak/keycloak-admin-client/lib/defs/clientProfilesRepresentation"
import {
  canCreateRealm,
  canManageRealm,
  canViewRealms,
} from "@/lib/auth/roles"
import {
  requireRealmCreator,
  requireRealmManager,
  requireRealmViewer,
  requireSession,
} from "@/lib/auth/session"
import { getAdminClient } from "@/lib/keycloak/admin-client"
import {
  BUILT_IN_CLIENT_IDS,
  CONSOLE_CLIENT_ID,
} from "@/lib/keycloak/oidc-clients"
import {
  MASTER_REALM,
  defaultWorkspaceRealm,
  isProtectedRealm,
  isValidRealmName,
} from "@/lib/keycloak/workspace"

export type AdminRealm = {
  realm: string
  displayName: string
  enabled: boolean
  sslRequired: string
  registrationAllowed: boolean
  protected: boolean
}

export type RealmSettings = {
  realm: RealmRepresentation
  events: RealmEventsConfigRepresentation
  keys: KeyMetadataRepresentation[]
  userProfile: UserProfileConfig
  clientPolicies: ClientPoliciesRepresentation
  clientProfiles: ClientProfilesRepresentation
}

function toAdminRealm(item: RealmRepresentation): AdminRealm {
  const realm = item.realm ?? ""
  return {
    realm,
    displayName: item.displayName || realm,
    enabled: item.enabled !== false,
    sslRequired: item.sslRequired ?? "external",
    registrationAllowed: item.registrationAllowed === true,
    protected: isProtectedRealm(realm),
  }
}

function realmPatchPayload(
  current: RealmRepresentation,
  patch: Partial<RealmRepresentation>,
): RealmRepresentation {
  const attributes = patch.attributes
    ? Object.fromEntries(
        Object.entries(patch.attributes).filter(([, value]) => Boolean(value)),
      )
    : undefined

  return {
    id: current.id,
    realm: current.realm,
    ...patch,
    attributes:
      attributes && Object.keys(attributes).length ? attributes : undefined,
  }
}

async function masterAdminClient(accessToken: string) {
  return getAdminClient(accessToken, MASTER_REALM)
}

function templateRealmSettings(
  source: RealmRepresentation,
): Partial<RealmRepresentation> {
  return {
    sslRequired: source.sslRequired,
    registrationAllowed: source.registrationAllowed,
    registrationEmailAsUsername: source.registrationEmailAsUsername,
    resetPasswordAllowed: source.resetPasswordAllowed,
    rememberMe: source.rememberMe,
    loginWithEmailAllowed: source.loginWithEmailAllowed,
    duplicateEmailsAllowed: source.duplicateEmailsAllowed,
    verifyEmail: source.verifyEmail,
    editUsernameAllowed: source.editUsernameAllowed,
    loginTheme: source.loginTheme,
    accountTheme: source.accountTheme,
    adminTheme: source.adminTheme,
    emailTheme: source.emailTheme,
    ssoSessionIdleTimeout: source.ssoSessionIdleTimeout,
    ssoSessionMaxLifespan: source.ssoSessionMaxLifespan,
    ssoSessionIdleTimeoutRememberMe: source.ssoSessionIdleTimeoutRememberMe,
    ssoSessionMaxLifespanRememberMe: source.ssoSessionMaxLifespanRememberMe,
    clientSessionIdleTimeout: source.clientSessionIdleTimeout,
    clientSessionMaxLifespan: source.clientSessionMaxLifespan,
    offlineSessionIdleTimeout: source.offlineSessionIdleTimeout,
    offlineSessionMaxLifespan: source.offlineSessionMaxLifespan,
    offlineSessionMaxLifespanEnabled: source.offlineSessionMaxLifespanEnabled,
    accessTokenLifespan: source.accessTokenLifespan,
    accessTokenLifespanForImplicitFlow: source.accessTokenLifespanForImplicitFlow,
    accessCodeLifespan: source.accessCodeLifespan,
    accessCodeLifespanLogin: source.accessCodeLifespanLogin,
    accessCodeLifespanUserAction: source.accessCodeLifespanUserAction,
    actionTokenGeneratedByUserLifespan: source.actionTokenGeneratedByUserLifespan,
    actionTokenGeneratedByAdminLifespan: source.actionTokenGeneratedByAdminLifespan,
    refreshTokenMaxReuse: source.refreshTokenMaxReuse,
    revokeRefreshToken: source.revokeRefreshToken,
    oauth2DeviceCodeLifespan: source.oauth2DeviceCodeLifespan,
    oauth2DevicePollingInterval: source.oauth2DevicePollingInterval,
    browserSecurityHeaders: source.browserSecurityHeaders,
    bruteForceProtected: source.bruteForceProtected,
    permanentLockout: source.permanentLockout,
    maxFailureWaitSeconds: source.maxFailureWaitSeconds,
    minimumQuickLoginWaitSeconds: source.minimumQuickLoginWaitSeconds,
    waitIncrementSeconds: source.waitIncrementSeconds,
    maxDeltaTimeSeconds: source.maxDeltaTimeSeconds,
    failureFactor: source.failureFactor,
    maxTemporaryLockouts: source.maxTemporaryLockouts,
    internationalizationEnabled: source.internationalizationEnabled,
    defaultLocale: source.defaultLocale,
    supportedLocales: source.supportedLocales,
    passwordPolicy: source.passwordPolicy,
    otpPolicyType: source.otpPolicyType,
    otpPolicyAlgorithm: source.otpPolicyAlgorithm,
    otpPolicyDigits: source.otpPolicyDigits,
    otpPolicyLookAheadWindow: source.otpPolicyLookAheadWindow,
    otpPolicyPeriod: source.otpPolicyPeriod,
    otpPolicyCodeReusable: source.otpPolicyCodeReusable,
    smtpServer: source.smtpServer,
  }
}

async function cloneTemplateProfile(accessToken: string, fromRealm: string, toRealm: string) {
  const source = await getAdminClient(accessToken, fromRealm)
  const target = await getAdminClient(accessToken, toRealm)
  const profile = await source.users.getProfile({ realm: fromRealm })
  await target.users.updateProfile({ ...profile, realm: toRealm })
}

async function cloneTemplateClients(accessToken: string, fromRealm: string, toRealm: string) {
  const source = await getAdminClient(accessToken, fromRealm)
  const target = await getAdminClient(accessToken, toRealm)
  const clients = await source.clients.find({ max: 200 })
  const existing = new Set(
    (await target.clients.find({ max: 200 })).map((item) => item.clientId),
  )

  for (const item of clients) {
    const clientId = item.clientId ?? ""
    if (
      !clientId ||
      BUILT_IN_CLIENT_IDS.has(clientId) ||
      clientId === CONSOLE_CLIENT_ID ||
      existing.has(clientId)
    ) {
      continue
    }

    const secret = item.publicClient
      ? undefined
      : await source.clients.getClientSecret({ id: item.id! }).catch(() => undefined)
    const mappers = (item.protocolMappers ?? []).map(
      ({ id: _id, ...mapper }) => mapper,
    )

    await target.clients.create({
      clientId,
      name: item.name,
      description: item.description,
      enabled: item.enabled,
      protocol: item.protocol ?? "openid-connect",
      publicClient: item.publicClient,
      secret: secret?.value,
      rootUrl: item.rootUrl,
      baseUrl: item.baseUrl,
      redirectUris: item.redirectUris,
      webOrigins: item.webOrigins,
      standardFlowEnabled: item.standardFlowEnabled,
      implicitFlowEnabled: item.implicitFlowEnabled,
      directAccessGrantsEnabled: item.directAccessGrantsEnabled,
      serviceAccountsEnabled: item.serviceAccountsEnabled,
      fullScopeAllowed: item.fullScopeAllowed,
      attributes: item.attributes,
      defaultClientScopes: item.defaultClientScopes,
      optionalClientScopes: item.optionalClientScopes,
      protocolMappers: mappers.length ? mappers : undefined,
    })
  }
}

export async function listRealms() {
  const session = await requireRealmViewer()
  const client = await masterAdminClient(session.accessToken!)
  const found = await client.realms.find()
  const realms = found
    .filter((item) => item.realm)
    .map(toAdminRealm)
    .sort((a, b) => a.realm.localeCompare(b.realm))
  return {
    realms,
    total: realms.length,
    canManage: canManageRealm(session.roles),
    canCreate: canCreateRealm(session.roles),
  }
}

export async function listRealmNames() {
  const session = await requireSession()
  if (!canViewRealms(session.roles)) return []
  try {
    const client = await masterAdminClient(session.accessToken!)
    const found = await client.realms.find({ briefRepresentation: true })
    return found
      .map((item) => item.realm)
      .filter((name): name is string => Boolean(name))
      .sort((a, b) => a.localeCompare(b))
  } catch {
    return []
  }
}

export async function getRealm(realm: string) {
  const session = await requireRealmViewer()
  if (!isValidRealmName(realm)) return null
  const client = await masterAdminClient(session.accessToken!)
  const found = await client.realms.findOne({ realm })
  if (!found?.realm) return null
  return {
    realm: toAdminRealm(found),
    representation: found,
    canManage: canManageRealm(session.roles),
  }
}

export async function getRealmSettings(realm: string): Promise<RealmSettings | null> {
  const session = await requireRealmViewer()
  if (!isValidRealmName(realm)) return null
  const client = await getAdminClient(session.accessToken!, realm)
  const found = await client.realms.findOne({ realm })
  if (!found?.realm) return null

  const [events, keys, userProfile, clientPolicies, clientProfiles] =
    await Promise.all([
      client.realms.getConfigEvents({ realm }).catch(() => ({})),
      client.realms.getKeys({ realm }).catch(() => ({ keys: [] })),
      client.users.getProfile({ realm }).catch(() => ({})),
      client.clientPolicies
        .listPolicies({ realm, includeGlobalPolicies: true })
        .catch(() => ({ policies: [] })),
      client.clientPolicies
        .listProfiles({ realm, includeGlobalProfiles: true })
        .catch(() => ({ profiles: [] })),
    ])

  return {
    realm: found,
    events,
    keys: keys.keys ?? [],
    userProfile,
    clientPolicies,
    clientProfiles,
  }
}

export async function createRealm(input: {
  realm: string
  displayName?: string
  enabled?: boolean
}) {
  const realm = input.realm.trim()
  if (!isValidRealmName(realm)) {
    throw new Error("Realm name must start with a letter or number.")
  }
  if (realm === "master") {
    throw new Error("The master realm already exists.")
  }

  const session = await requireRealmCreator()
  const client = await masterAdminClient(session.accessToken!)
  const template = defaultWorkspaceRealm()
  const source = await client.realms.findOne({ realm: template })
  if (!source?.realm) {
    throw new Error(`Template realm "${template}" was not found.`)
  }

  await client.realms.create({
    realm,
    displayName: input.displayName?.trim() || realm,
    enabled: input.enabled ?? true,
    ...templateRealmSettings(source),
  })

  try {
    await cloneTemplateProfile(session.accessToken!, template, realm)
    await cloneTemplateClients(session.accessToken!, template, realm)
  } catch (error) {
    await client.realms.del({ realm }).catch(() => undefined)
    throw error
  }

  return realm
}

export async function updateRealm(
  realm: string,
  patch: Partial<RealmRepresentation>,
) {
  if (!isValidRealmName(realm)) throw new Error("Invalid realm name")
  if (isProtectedRealm(realm) && patch.enabled === false) {
    throw new Error(`The ${realm} realm cannot be disabled.`)
  }

  const session = await requireRealmManager()
  const client = await masterAdminClient(session.accessToken!)
  const current = await client.realms.findOne({ realm })
  if (!current?.realm) throw new Error("Realm not found")

  try {
    await client.realms.update({ realm }, realmPatchPayload(current, patch))
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error"
    throw new Error(
      `Could not update ${realm} (${detail}). Roles: ${session.roles.join(", ") || "none"}`,
    )
  }
}

export async function setRealmEnabled(realm: string, enabled: boolean) {
  await updateRealm(realm, { enabled })
}

export async function deleteRealm(realm: string) {
  if (isProtectedRealm(realm)) {
    throw new Error(`The ${realm} realm cannot be deleted.`)
  }
  await requireRealmManager()
  const session = await requireSession()
  const client = await masterAdminClient(session.accessToken!)
  await client.realms.del({ realm })
}

export async function updateRealmEvents(
  realm: string,
  config: RealmEventsConfigRepresentation,
) {
  const session = await requireRealmManager()
  const client = await masterAdminClient(session.accessToken!)
  await client.realms.updateConfigEvents({ realm }, config)
}

export async function updateRealmUserProfile(
  realm: string,
  profile: UserProfileConfig,
) {
  const session = await requireRealmManager()
  const client = await getAdminClient(session.accessToken!, realm)
  await client.users.updateProfile({ ...profile, realm })
}

export async function updateRealmClientPolicies(
  realm: string,
  input: {
    policies?: ClientPoliciesRepresentation
    profiles?: ClientProfilesRepresentation
  },
) {
  const session = await requireRealmManager()
  const client = await getAdminClient(session.accessToken!, realm)
  if (input.profiles) {
    await client.clientPolicies.createProfiles({ ...input.profiles, realm })
  }
  if (input.policies) {
    await client.clientPolicies.updatePolicy({ ...input.policies, realm })
  }
}
