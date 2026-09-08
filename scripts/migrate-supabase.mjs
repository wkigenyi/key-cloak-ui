/**
 * Migrate self-help users from per-SACCO Supabase into Keycloak
 * (one realm per SACCO, cloned from the `app` template).
 *
 * Sources (first that works):
 *   --json path.json     SACCO list you paste (see scripts/saccos.example.json)
 *   DATABASE_URL         Neon `customers` where is_sacco
 *   HOOKS_URL + BANKAYO_API_KEY   hooks.bankayo.io
 *
 * Usage:
 *   pnpm migrate:supabase --dry-run
 *   pnpm migrate:supabase --sacco=acme
 *   pnpm migrate:supabase --json saccos.json --passwords=hashes --hashes-file hashes.json
 *
 * Passwords: Supabase Admin API does not return bcrypt hashes. To import them,
 * pass --hashes-file (map of supabase user id / email / phone → $2a$… hash)
 * or --pg-url on a SACCO row (direct Postgres, SELECT auth.users).
 * Otherwise users are created with required action UPDATE_PASSWORD.
 */
import { readFile } from "node:fs/promises"

const keycloak = process.env.KEYCLOAK_URL ?? "http://127.0.0.1:8080"
const templateRealm = process.env.KEYCLOAK_REALM ?? "app"
const hooksUrl = (process.env.HOOKS_URL ?? "https://hooks.bankayo.io").replace(/\/$/, "")
const hooksKey = (
  process.env.BANKAYO_API_KEY ??
  process.env.NEXT_PUBLIC_BANKAYO_API_KEY ??
  ""
).trim()

const BUILT_IN_CLIENTS = new Set([
  "account",
  "account-console",
  "admin-cli",
  "broker",
  "realm-management",
  "security-admin-console",
])

const REALM_SETTINGS = [
  "sslRequired",
  "registrationAllowed",
  "registrationEmailAsUsername",
  "resetPasswordAllowed",
  "rememberMe",
  "loginWithEmailAllowed",
  "duplicateEmailsAllowed",
  "verifyEmail",
  "editUsernameAllowed",
  "loginTheme",
  "accountTheme",
  "adminTheme",
  "emailTheme",
  "ssoSessionIdleTimeout",
  "ssoSessionMaxLifespan",
  "ssoSessionIdleTimeoutRememberMe",
  "ssoSessionMaxLifespanRememberMe",
  "clientSessionIdleTimeout",
  "clientSessionMaxLifespan",
  "offlineSessionIdleTimeout",
  "offlineSessionMaxLifespan",
  "offlineSessionMaxLifespanEnabled",
  "accessTokenLifespan",
  "accessTokenLifespanForImplicitFlow",
  "accessCodeLifespan",
  "accessCodeLifespanLogin",
  "accessCodeLifespanUserAction",
  "actionTokenGeneratedByUserLifespan",
  "actionTokenGeneratedByAdminLifespan",
  "refreshTokenMaxReuse",
  "revokeRefreshToken",
  "oauth2DeviceCodeLifespan",
  "oauth2DevicePollingInterval",
  "browserSecurityHeaders",
  "bruteForceProtected",
  "permanentLockout",
  "maxFailureWaitSeconds",
  "minimumQuickLoginWaitSeconds",
  "waitIncrementSeconds",
  "maxDeltaTimeSeconds",
  "failureFactor",
  "maxTemporaryLockouts",
  "internationalizationEnabled",
  "defaultLocale",
  "supportedLocales",
  "passwordPolicy",
  "otpPolicyType",
  "otpPolicyAlgorithm",
  "otpPolicyDigits",
  "otpPolicyLookAheadWindow",
  "otpPolicyPeriod",
  "otpPolicyCodeReusable",
  "smtpServer",
]

function args() {
  const argv = process.argv.slice(2)
  const flags = {
    dryRun: argv.includes("--dry-run"),
    all: argv.includes("--all"),
    passwords: "reset",
    json: "",
    hashesFile: "",
    sacco: "",
    exclude: "",
    limit: 0,
  }
  for (const item of argv) {
    if (item.startsWith("--sacco=")) flags.sacco = item.slice(8)
    if (item.startsWith("--exclude=")) flags.exclude = item.slice(10)
    if (item.startsWith("--json=")) flags.json = item.slice(7)
    if (item.startsWith("--hashes-file=")) flags.hashesFile = item.slice(14)
    if (item.startsWith("--passwords=")) flags.passwords = item.slice(12)
    if (item.startsWith("--limit=")) flags.limit = Number(item.slice(8)) || 0
  }
  const jsonPos = argv.findIndex((item) => item === "--json")
  if (jsonPos >= 0 && argv[jsonPos + 1] && !argv[jsonPos + 1].startsWith("--")) {
    flags.json = argv[jsonPos + 1]
  }
  return flags
}

function toRealmName(shortName) {
  const cleaned = String(shortName ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
  if (!/^[a-z0-9][a-z0-9._-]{0,254}$/.test(cleaned) || cleaned === "master") {
    throw new Error(`Cannot use "${shortName}" as a Keycloak realm name`)
  }
  return cleaned
}

function supabaseUrl(ref) {
  const raw = String(ref ?? "").trim().replace(/\/$/, "")
  if (!raw) return ""
  return raw.startsWith("http") ? raw : `https://${raw}.supabase.co`
}

function firstMeta(meta, ...keys) {
  for (const key of keys) {
    const value = meta?.[key]
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim()
    }
  }
  return ""
}

function clientIdOf(user) {
  return firstMeta(user.user_metadata, "clientId", "fineract_client_id", "client_id")
}

function usernameOf(user) {
  const phone = (user.phone || firstMeta(user.user_metadata, "phone") || "").trim()
  if (phone) return phone
  if (user.email) return user.email
  return user.id
}

function bcryptCredential(hash) {
  const cost = Number((String(hash).match(/\$2[aby]?\$(\d+)\$/) || [])[1] || 10)
  return {
    type: "password",
    temporary: false,
    secretData: JSON.stringify({ value: hash, salt: "" }),
    credentialData: JSON.stringify({
      algorithm: "bcrypt",
      hashIterations: cost,
    }),
  }
}

async function request(url, init = {}, retries = 5) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) })
    } catch (error) {
      lastError = error
      const wait = Math.min(10_000, 750 * 2 ** attempt)
      console.warn(
        `retry ${attempt + 1}/${retries} ${new URL(url).pathname} (${error instanceof Error ? error.message : error})`,
      )
      await new Promise((resolve) => setTimeout(resolve, wait))
    }
  }
  throw lastError
}

class AdminSession {
  constructor() {
    this.accessToken = ""
    this.refreshToken = ""
    this.expiresAt = 0
  }

  apply(body) {
    if (!body.access_token) {
      throw new Error("Keycloak master token failed")
    }
    this.accessToken = body.access_token
    this.refreshToken = body.refresh_token ?? ""
    this.expiresAt = Date.now() + Math.max(20, Number(body.expires_in ?? 60)) * 1000
  }

  async login() {
    const response = await request(
      `${keycloak}/realms/master/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username: process.env.KEYCLOAK_ADMIN ?? "admin",
          password: process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin",
          grant_type: "password",
          client_id: "admin-cli",
        }),
      },
    )
    this.apply(await response.json())
  }

  async refresh() {
    const response = await request(
      `${keycloak}/realms/master/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: "admin-cli",
          refresh_token: this.refreshToken,
        }),
      },
    )
    const body = await response.json()
    if (!response.ok || !body.access_token) {
      throw new Error(`Keycloak refresh failed: ${response.status}`)
    }
    this.apply(body)
  }

  async token() {
    if (this.accessToken && Date.now() < this.expiresAt - 15_000) {
      return this.accessToken
    }
    if (this.refreshToken) {
      try {
        await this.refresh()
        return this.accessToken
      } catch {
        this.refreshToken = ""
      }
    }
    await this.login()
    return this.accessToken
  }
}

async function kc(session, realm, path, init = {}, retried = false) {
  const accessToken = typeof session === "string" ? session : await session.token()
  const response = await request(`${keycloak}/admin/realms/${realm}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })
  const text = await response.text()
  if (response.status === 401 && !retried && typeof session !== "string") {
    session.expiresAt = 0
    session.refreshToken = ""
    return kc(session, realm, path, init, true)
  }
  if (!response.ok) {
    throw new Error(
      `${init.method ?? "GET"} /admin/realms/${realm}${path} ${response.status} ${text}`,
    )
  }
  if (response.status === 204 || response.status === 201 || !text) {
    return { location: response.headers.get("location"), status: response.status }
  }
  return JSON.parse(text)
}

async function loadSaccosFromJson(path) {
  const raw = JSON.parse(await readFile(path, "utf8"))
  const rows = Array.isArray(raw) ? raw : (raw.saccos ?? [])
  return rows.map(normalizeSacco)
}

async function loadSaccosFromNeon() {
  const url = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL
  if (!url) return []
  const { neon } = await import("@neondatabase/serverless")
  const sql = neon(url)
  const rows = await sql`
    SELECT id, short_name, full_name, supabase_project_ref, supabase_secret_key,
           supabase_publishable_key, suspended
    FROM customers
    WHERE is_sacco = true
  `
  return rows.map(normalizeSacco)
}

async function loadSaccosFromHooks() {
  if (!hooksKey) return []
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${hooksKey}`,
    "x-api-key": hooksKey,
  }
  const list = await fetch(`${hooksUrl}/saccos`, { headers })
  if (!list.ok) {
    throw new Error(`hooks /saccos ${list.status} ${await list.text()}`)
  }
  const saccos = await list.json()
  const rows = []
  for (const item of saccos) {
    const detail = await fetch(
      `${hooksUrl}/api/sacco-token?saccoId=${encodeURIComponent(item.id)}`,
      { headers },
    )
    if (!detail.ok) {
      console.warn(`skip ${item.id}: sacco-token ${detail.status}`)
      continue
    }
    rows.push(normalizeSacco({ ...(await detail.json()), id: item.id }))
  }
  return rows
}

function present(value) {
  return Boolean(value && String(value).trim())
}

function normalizeSacco(row) {
  return {
    id: row.id ?? row.saccoId ?? "",
    short_name: String(row.short_name ?? "").trim(),
    full_name: String(row.full_name ?? row.short_name ?? "").trim(),
    supabase_project_ref: String(row.supabase_project_ref ?? "").trim(),
    supabase_secret_key: String(row.supabase_secret_key ?? "").trim(),
    pg_url: String(row.pg_url ?? row.supabase_db_url ?? "").trim(),
    suspended: row.suspended === true,
    is_sacco: row.is_sacco !== false,
  }
}

function isUsableSupabaseRef(ref) {
  if (!present(ref)) return false
  if (ref.startsWith("http")) return true
  return /^[a-z0-9]{15,}$/i.test(ref)
}

async function listSupabaseUsers(sacco) {
  const url = supabaseUrl(sacco.supabase_project_ref)
  const key = sacco.supabase_secret_key.trim()
  const users = []
  let page = 1
  while (page <= 100) {
    const response = await fetch(
      `${url}/auth/v1/admin/users?page=${page}&per_page=1000`,
      {
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
        },
      },
    )
    if (!response.ok) {
      throw new Error(
        `Supabase list users ${sacco.short_name} ${response.status} ${await response.text()}`,
      )
    }
    const body = await response.json()
    const batch = body.users ?? body
    if (!Array.isArray(batch) || batch.length === 0) break
    users.push(...batch)
    if (batch.length < 1000) break
    page += 1
  }
  return users
}

async function loadHashesFromFile(path) {
  if (!path) return new Map()
  const raw = JSON.parse(await readFile(path, "utf8"))
  return new Map(Object.entries(raw).map(([key, value]) => [String(key), String(value)]))
}

async function loadHashesFromPostgres(pgUrl) {
  if (!pgUrl) return new Map()
  const { neon } = await import("@neondatabase/serverless")
  const sql = neon(pgUrl)
  const rows = await sql`
    SELECT id::text AS id, email, phone, encrypted_password
    FROM auth.users
    WHERE encrypted_password IS NOT NULL
  `
  const map = new Map()
  for (const row of rows) {
    if (row.id) map.set(row.id, row.encrypted_password)
    if (row.email) map.set(String(row.email).toLowerCase(), row.encrypted_password)
    if (row.phone) map.set(row.phone, row.encrypted_password)
  }
  return map
}

function hashFor(user, hashes) {
  return (
    hashes.get(user.id) ||
    hashes.get(String(user.email ?? "").toLowerCase()) ||
    hashes.get(user.phone ?? "") ||
    ""
  )
}

async function ensureRealm(session, realm, displayName, dryRun) {
  const accessToken = typeof session === "string" ? session : await session.token()
  const existing = await request(`${keycloak}/admin/realms/${realm}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (existing.ok) return false
  if (dryRun) return true

  const template = await kc(session, templateRealm, "")
  const settings = Object.fromEntries(
    REALM_SETTINGS.filter((key) => template[key] !== undefined).map((key) => [
      key,
      template[key],
    ]),
  )
  await request(`${keycloak}/admin/realms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${typeof session === "string" ? session : await session.token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      realm,
      displayName,
      enabled: true,
      ...settings,
    }),
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Create realm ${realm} ${response.status} ${await response.text()}`)
    }
  })

  const profile = await kc(session, templateRealm, "/users/profile")
  const names = new Set((profile.attributes ?? []).map((item) => item.name))
  for (const name of ["supabase_user_id", "migration"]) {
    if (names.has(name)) continue
    profile.attributes = [
      ...(profile.attributes ?? []),
      {
        name,
        displayName: name,
        group: "user-metadata",
        permissions: { view: ["admin"], edit: ["admin"] },
        multivalued: false,
      },
    ]
  }
  await kc(session, realm, "/users/profile", {
    method: "PUT",
    body: JSON.stringify({ ...profile, unmanagedAttributePolicy: "ADMIN_EDIT" }),
  })

  const clients = await kc(session, templateRealm, "/clients?max=200")
  for (const item of clients) {
    const clientId = item.clientId ?? ""
    if (!clientId || BUILT_IN_CLIENTS.has(clientId) || clientId === "keycloak-ui") {
      continue
    }
    let secret
    if (!item.publicClient && item.id) {
      try {
        secret = await kc(
          session,
          templateRealm,
          `/clients/${item.id}/client-secret`,
        )
      } catch {
        secret = undefined
      }
    }
    const mappers = (item.protocolMappers ?? []).map(({ id: _id, ...mapper }) => mapper)
    await kc(session, realm, "/clients", {
      method: "POST",
      body: JSON.stringify({
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
      }),
    })
  }
  return true
}

async function findKeycloakUser(session, realm, username, clientId) {
  const exact = await kc(
    session,
    realm,
    `/users?username=${encodeURIComponent(username)}&exact=true`,
  )
  if (exact[0]) return exact[0]
  if (!clientId) return null
  const found = await kc(
    session,
    realm,
    `/users?q=clientId:${encodeURIComponent(clientId)}&max=20`,
  )
  return (
    found.find(
      (user) =>
        user.attributes?.clientId?.[0] === clientId ||
        user.attributes?.fineract_client_id?.[0] === clientId,
    ) ?? null
  )
}

async function upsertUser(session, realm, user, hash, dryRun) {
  const clientId = clientIdOf(user)
  if (!clientId) return "skipped"
  const username = usernameOf(user)
  const firstName =
    firstMeta(user.user_metadata, "firstname", "firstName", "first_name") ||
    undefined
  const lastName =
    firstMeta(user.user_metadata, "lastname", "lastName", "last_name") ||
    undefined
  const displayName =
    firstMeta(user.user_metadata, "displayName") ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    username
  const attributes = {
    clientId: [clientId],
    fineract_client_id: [clientId],
    saccoId: [realm],
    phone: [user.phone || firstMeta(user.user_metadata, "phone")].filter(Boolean),
    displayName: [displayName],
    provisioned_at: [
      firstMeta(user.user_metadata, "provisioned_at") ||
        user.created_at ||
        new Date().toISOString(),
    ],
    migration: [
      firstMeta(user.user_metadata, "migration") || "supabase-keycloak-v1",
    ],
    supabase_user_id: [user.id],
  }

  const payload = {
    username,
    email: user.email || undefined,
    firstName,
    lastName,
    enabled: !user.banned_until && !user.deleted_at,
    emailVerified: Boolean(user.email_confirmed_at),
    attributes,
    requiredActions: hash ? [] : ["UPDATE_PASSWORD"],
    credentials: hash ? [bcryptCredential(hash)] : undefined,
  }

  if (dryRun) return "dry-run"

  const existing = await findKeycloakUser(session, realm, username, clientId)
  if (existing?.id) {
    await kc(session, realm, `/users/${existing.id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...existing,
        ...payload,
        id: existing.id,
        credentials: undefined,
      }),
    })
    if (hash) {
      await kc(session, realm, `/users/${existing.id}/reset-password`, {
        method: "PUT",
        body: JSON.stringify(bcryptCredential(hash)),
      }).catch(() => undefined)
    }
    return "updated"
  }

  await kc(session, realm, "/users", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return "created"
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`Usage: pnpm migrate:supabase [options]

  --dry-run              List what would be imported
  --json <file>          SACCO list (see scripts/saccos.example.json)
  --sacco=<short_name>   Only this SACCO
  --exclude=<names>      Comma-separated short_names to skip
  --limit=N              Cap users per SACCO
  --passwords=reset      Create users that must set a new password (default)
  --passwords=hashes     Import bcrypt hashes from --hashes-file and/or pg_url
  --hashes-file <file>   Map of supabase id/email/phone → $2a$ hash

Sources: --json, or DATABASE_URL (Neon customers), or HOOKS_URL + BANKAYO_API_KEY.`)
    return
  }

  const flags = args()
  let saccos = []
  if (flags.json) saccos = await loadSaccosFromJson(flags.json)
  else {
    saccos = await loadSaccosFromNeon()
    if (!saccos.length) saccos = await loadSaccosFromHooks()
  }

  saccos = saccos.filter((item) => item.is_sacco !== false)
  if (flags.sacco) {
    saccos = saccos.filter(
      (item) =>
        item.short_name === flags.sacco ||
        item.id === flags.sacco ||
        toRealmName(item.short_name) === flags.sacco,
    )
  }
  if (flags.exclude) {
    const skip = new Set(
      flags.exclude.split(",").map((name) => name.trim()).filter(Boolean),
    )
    saccos = saccos.filter((item) => !skip.has(item.short_name))
  }
  saccos = saccos.filter(
    (item) =>
      !item.suspended &&
      present(item.short_name) &&
      isUsableSupabaseRef(item.supabase_project_ref) &&
      present(item.supabase_secret_key),
  )
  const byRealm = new Map()
  for (const item of saccos) {
    const realm = toRealmName(item.short_name)
    if (!byRealm.has(realm)) byRealm.set(realm, item)
  }
  saccos = [...byRealm.values()]
  const byProject = new Map()
  for (const item of saccos) {
    const key = supabaseUrl(item.supabase_project_ref)
    byProject.set(key, [...(byProject.get(key) ?? []), item.short_name])
  }
  for (const names of byProject.values()) {
    if (names.length > 1) {
      console.warn(`Shared Supabase project: ${names.join(", ")}`)
    }
  }

  if (!saccos.length) {
    throw new Error(
      "No SACCOs found. Pass --json saccos.json, or set DATABASE_URL, or HOOKS_URL + BANKAYO_API_KEY.",
    )
  }

  const fileHashes = await loadHashesFromFile(flags.hashesFile)
  const session = flags.dryRun ? "" : new AdminSession()
  if (session) await session.login()
  const summary = []

  for (const sacco of saccos) {
    const realm = toRealmName(sacco.short_name)
    let users
    try {
      users = await listSupabaseUsers(sacco)
    } catch (error) {
      console.warn(
        `${sacco.short_name}: skipped (${error instanceof Error ? error.message : error})`,
      )
      summary.push({
        sacco: sacco.short_name,
        realm,
        error: String(error instanceof Error ? error.message : error),
      })
      continue
    }
    const members = users.filter((user) => clientIdOf(user))
    const limited = flags.limit ? members.slice(0, flags.limit) : members
    const hashes = new Map(fileHashes)
    if (flags.passwords === "hashes" && sacco.pg_url) {
      for (const [key, value] of await loadHashesFromPostgres(sacco.pg_url)) {
        hashes.set(key, value)
      }
    }

    const created = flags.dryRun
      ? true
      : await ensureRealm(session, realm, sacco.full_name, flags.dryRun)

    let createdUsers = 0
    let updatedUsers = 0
    let skipped = users.length - members.length
    let failed = 0
    let withHash = 0
    for (const [index, user] of limited.entries()) {
      const hash =
        flags.passwords === "hashes" ? hashFor(user, hashes) : ""
      if (hash) withHash += 1
      try {
        const result = await upsertUser(session, realm, user, hash, flags.dryRun)
        if (result === "created" || result === "dry-run") createdUsers += 1
        if (result === "updated") updatedUsers += 1
        if (result === "skipped") skipped += 1
      } catch (error) {
        failed += 1
        console.warn(
          `${sacco.short_name}: user ${usernameOf(user)} failed (${error instanceof Error ? error.message : error})`,
        )
      }
      if ((index + 1) % 100 === 0 || index + 1 === limited.length) {
        console.log(
          `${sacco.short_name}: ${index + 1}/${limited.length} users (${createdUsers} created, ${updatedUsers} updated, ${failed} failed)`,
        )
      }
    }

    summary.push({
      sacco: sacco.short_name,
      realm,
      realmCreated: created,
      supabaseUsers: users.length,
      selfHelp: members.length,
      imported: limited.length,
      created: createdUsers,
      updated: updatedUsers,
      skipped,
      failed,
      hashes: withHash,
    })
    console.log(
      `${flags.dryRun ? "[dry-run] " : ""}${sacco.short_name} → ${realm}: ${members.length} self-help / ${users.length} supabase (${withHash} hashes)`,
    )
  }

  console.log(JSON.stringify({ dryRun: flags.dryRun, saccos: summary }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
