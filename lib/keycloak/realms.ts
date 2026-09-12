import "server-only"

import type RealmRepresentation from "@keycloak/keycloak-admin-client/lib/defs/realmRepresentation"
import type { RealmEventsConfigRepresentation } from "@keycloak/keycloak-admin-client/lib/defs/realmEventsConfigRepresentation"
import type { KeyMetadataRepresentation } from "@keycloak/keycloak-admin-client/lib/defs/keyMetadataRepresentation"
import {
  UnmanagedAttributePolicy,
  type UserProfileConfig,
} from "@keycloak/keycloak-admin-client/lib/defs/userProfileMetadata"
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
import { toActionError } from "@/lib/keycloak/errors"
import {
  BUILT_IN_CLIENT_IDS,
  CONSOLE_CLIENT_ID,
} from "@/lib/keycloak/oidc-clients"
import { SELF_HELP_ATTRIBUTE_NAMES } from "@/lib/keycloak/self-help"
import {
  MASTER_REALM,
  defaultWorkspaceRealm,
  getWorkspaceRealm,
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

async function masterAdminClient() {
  return getAdminClient(undefined, MASTER_REALM)
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

function withSelfHelpProfileAttributes(profile: UserProfileConfig): UserProfileConfig {
  const existing = new Set(
    (profile.attributes ?? []).map((attribute) => attribute.name).filter(Boolean),
  )
  const attributes = [...(profile.attributes ?? [])]
  for (const name of SELF_HELP_ATTRIBUTE_NAMES) {
    if (existing.has(name)) continue
    attributes.push({
      name,
      displayName: name,
      group: "user-metadata",
      permissions: { view: ["admin", "user"], edit: ["admin"] },
      multivalued: false,
    })
  }
  const unmanaged =
    !profile.unmanagedAttributePolicy ||
    profile.unmanagedAttributePolicy === UnmanagedAttributePolicy.Disabled
      ? UnmanagedAttributePolicy.AdminEdit
      : profile.unmanagedAttributePolicy
  return {
    ...profile,
    attributes,
    unmanagedAttributePolicy: unmanaged,
  }
}

function profileNeedsSelfHelpAttributes(profile: UserProfileConfig) {
  const existing = new Set(
    (profile.attributes ?? []).map((attribute) => attribute.name).filter(Boolean),
  )
  const missing = SELF_HELP_ATTRIBUTE_NAMES.some((name) => !existing.has(name))
  const blocked =
    !profile.unmanagedAttributePolicy ||
    profile.unmanagedAttributePolicy === UnmanagedAttributePolicy.Disabled
  return missing || blocked
}

export async function ensureSelfHelpUserProfile(realm?: string) {
  const name = realm ?? (await getWorkspaceRealm())
  const client = await getAdminClient(undefined, name)
  const profile = await client.users.getProfile()
  if (!profileNeedsSelfHelpAttributes(profile)) return
  const { realm: _realm, ...config } = withSelfHelpProfileAttributes(profile) as
    typeof profile & { realm?: string }
  await client.users.updateProfile(config)
}

async function cloneTemplateProfile(fromRealm: string, toRealm: string) {
  const source = await getAdminClient(undefined, fromRealm)
  const target = await getAdminClient(undefined, toRealm)
  try {
    const profile = await source.users.getProfile()
    const { realm: _realm, ...config } = withSelfHelpProfileAttributes(
      profile,
    ) as typeof profile & { realm?: string }
    await target.users.updateProfile(config)
  } catch (error) {
    throw toActionError(error, "Could not copy the template user profile")
  }
}

async function cloneTemplateScopes(fromRealm: string, toRealm: string) {
  const source = await getAdminClient(undefined, fromRealm)
  const target = await getAdminClient(undefined, toRealm)
  const [sourceScopes, targetScopes] = await Promise.all([
    source.clientScopes.find({ realm: fromRealm }),
    target.clientScopes.find({ realm: toRealm }),
  ])
  const existing = new Set(targetScopes.map((item) => item.name).filter(Boolean))

  for (const scope of sourceScopes) {
    const name = scope.name ?? ""
    if (!name || existing.has(name)) continue
    const mappers = (scope.protocolMappers ?? []).map(
      ({ id: _id, ...mapper }) => mapper,
    )
    try {
      await target.clientScopes.create({
        name,
        description: scope.description,
        protocol: scope.protocol,
        attributes: scope.attributes,
        protocolMappers: mappers.length ? mappers : undefined,
      })
    } catch (error) {
      throw toActionError(error, `Could not copy client scope "${name}"`)
    }
  }
}

async function cloneTemplateClients(fromRealm: string, toRealm: string) {
  const source = await getAdminClient(undefined, fromRealm)
  const target = await getAdminClient(undefined, toRealm)
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

    try {
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
    } catch (error) {
      throw toActionError(error, `Could not copy client "${clientId}"`)
    }
  }
}

export async function listRealms() {
  const session = await requireRealmViewer()
  const client = await masterAdminClient()
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
    const client = await masterAdminClient()
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
  const client = await masterAdminClient()
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
  const client = await getAdminClient(undefined, realm)
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

  await requireRealmCreator()
  const client = await masterAdminClient()
  const template = defaultWorkspaceRealm()
  const source = await client.realms.findOne({ realm: template })
  if (!source?.realm) {
    throw new Error(`Template realm "${template}" was not found.`)
  }

  const existing = await client.realms.findOne({ realm })
  if (existing?.realm) {
    throw new Error(`A realm named "${realm}" already exists.`)
  }

  try {
    await client.realms.create({
      realm,
      displayName: input.displayName?.trim() || realm,
      enabled: input.enabled ?? true,
      ...templateRealmSettings(source),
    })
  } catch (error) {
    throw toActionError(error, `Could not create realm "${realm}"`)
  }

  try {
    await cloneTemplateProfile(template, realm)
    await cloneTemplateScopes(template, realm)
    await cloneTemplateClients(template, realm)
  } catch (error) {
    await client.realms.del({ realm }).catch(() => undefined)
    throw toActionError(error, "Could not copy the app template into the new realm")
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
  const client = await masterAdminClient()
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
  const client = await masterAdminClient()
  await client.realms.del({ realm })
}

export async function updateRealmEvents(
  realm: string,
  config: RealmEventsConfigRepresentation,
) {
  const session = await requireRealmManager()
  const client = await masterAdminClient()
  await client.realms.updateConfigEvents({ realm }, config)
}

function toUserProfilePayload(profile: UserProfileConfig): UserProfileConfig {
  const { realm: _realm, ...rest } = profile as typeof profile & {
    realm?: string
  }
  const next = withSelfHelpProfileAttributes(rest)
  const groups = [...(next.groups ?? [])]
  if (!groups.some((group) => group.name === "user-metadata")) {
    groups.push({
      name: "user-metadata",
      displayHeader: "User metadata",
      displayDescription: "Attributes, which refer to user metadata",
    })
  }
  return {
    attributes: next.attributes,
    groups,
    unmanagedAttributePolicy: next.unmanagedAttributePolicy,
  }
}

export async function updateRealmUserProfile(
  realm: string,
  profile: UserProfileConfig,
) {
  await requireRealmManager()
  const client = await getAdminClient(undefined, realm)
  try {
    await client.users.updateProfile(toUserProfilePayload(profile))
  } catch (error) {
    throw toActionError(error, "Could not save user profile")
  }
}

export async function updateRealmClientPolicies(
  realm: string,
  input: {
    policies?: ClientPoliciesRepresentation
    profiles?: ClientProfilesRepresentation
  },
) {
  const session = await requireRealmManager()
  const client = await getAdminClient(undefined, realm)
  if (input.profiles) {
    await client.clientPolicies.createProfiles({ ...input.profiles, realm })
  }
  if (input.policies) {
    await client.clientPolicies.updatePolicy({ ...input.policies, realm })
  }
}
