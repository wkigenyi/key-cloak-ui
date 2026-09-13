/**
 * Patch a running Keycloak (already imported once) so the `app` template/demo
 * realm has self-help sample users. New SACCOs are separate realms cloned from
 * `app` in the admin UI — this script does not create those.
 *
 * Usage: node scripts/seed-self-help.mjs
 */
const base = (process.env.KEYCLOAK_URL ?? "http://127.0.0.1:8080").replace(/\/$/, "")
const realm = process.env.KEYCLOAK_REALM ?? "app"
const consoleOrigin = (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "")
const seedDemoUsers =
  process.env.KEYCLOAK_SEED_DEMO === "1" ||
  (process.env.KEYCLOAK_SEED_DEMO !== "0" && base.includes("127.0.0.1"))
const sslRequired = base.startsWith("https://") ? "external" : "none"

const SELF_HELP_ATTRIBUTE_NAMES = [
  "clientId",
  "fineract_client_id",
  "saccoId",
  "phone",
  "displayName",
  "provisioned_at",
  "migration",
  "supabase_user_id",
]

async function token() {
  const body = new URLSearchParams({
    username: process.env.KEYCLOAK_ADMIN ?? "admin",
    password: process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin",
    grant_type: "password",
    client_id: "admin-cli",
  })
  const response = await fetch(
    `${base}/realms/master/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  )
  if (!response.ok) {
    throw new Error(`Master token failed: ${response.status}`)
  }
  return (await response.json()).access_token
}

async function api(accessToken, path, init = {}, targetRealm = realm) {
  const response = await fetch(`${base}/admin/realms/${targetRealm}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} ${response.status} ${text}`)
  }
  if (response.status === 204 || response.status === 201) {
    return { location: response.headers.get("location"), status: response.status }
  }
  return text ? JSON.parse(text) : {}
}

async function ensureUserProfile(accessToken) {
  const profile = await api(accessToken, "/users/profile")
  const existing = new Set((profile.attributes ?? []).map((attribute) => attribute.name))
  const attributes = [...(profile.attributes ?? [])]
  for (const name of SELF_HELP_ATTRIBUTE_NAMES) {
    if (existing.has(name)) continue
    attributes.push({
      name,
      displayName: name,
      group: "user-metadata",
      permissions: { view: ["admin"], edit: ["admin"] },
      multivalued: false,
    })
  }
  await api(accessToken, "/users/profile", {
    method: "PUT",
    body: JSON.stringify({
      ...profile,
      attributes,
      unmanagedAttributePolicy: "ADMIN_EDIT",
    }),
  })
}

async function ensureGroup(accessToken, name, parentId) {
  if (parentId) {
    const children = await api(
      accessToken,
      `/groups/${parentId}/children?briefRepresentation=true&max=200`,
    )
    const existing = children.find((group) => group.name === name)
    if (existing) return existing
    await api(accessToken, `/groups/${parentId}/children`, {
      method: "POST",
      body: JSON.stringify({ name }),
    })
    const created = await api(
      accessToken,
      `/groups/${parentId}/children?briefRepresentation=true&max=200`,
    )
    return created.find((group) => group.name === name)
  }

  const groups = await api(accessToken, `/groups?search=${name}&brief=true`)
  const existing = groups.find((group) => group.name === name)
  if (existing) return existing
  await api(accessToken, "/groups", {
    method: "POST",
    body: JSON.stringify({ name }),
  })
  const created = await api(accessToken, `/groups?search=${name}&brief=true`)
  return created.find((group) => group.name === name)
}

async function findUser(accessToken, username) {
  const users = await api(
    accessToken,
    `/users?username=${encodeURIComponent(username)}&exact=true`,
  )
  return users[0]
}

async function upsertSelfHelpUser(accessToken, sample, demoGroupId) {
  const attributes = {
    clientId: [sample.clientId],
    fineract_client_id: [sample.clientId],
    saccoId: ["demo-sacco"],
    phone: [sample.phone],
    displayName: [`${sample.firstName} ${sample.lastName}`],
    provisioned_at: ["2026-09-08T00:00:00.000Z"],
  }

  const found = []
  for (const username of sample.usernames) {
    const match = await findUser(accessToken, username)
    if (match && !found.some((user) => user.id === match.id)) found.push(match)
  }
  let user = found[0]
  for (const extra of found.slice(1)) {
    await fetch(`${base}/admin/realms/${realm}/users/${extra.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  }

  if (!user) {
    try {
      await api(accessToken, "/users", {
        method: "POST",
        body: JSON.stringify({
          username: sample.usernames[0],
          firstName: sample.firstName,
          lastName: sample.lastName,
          email: sample.email,
          enabled: sample.enabled,
          emailVerified: sample.enabled,
          attributes,
          credentials: [
            { type: "password", value: "password", temporary: false },
          ],
        }),
      })
    } catch (error) {
      if (!String(error).includes("409")) throw error
    }
    user = await findUser(accessToken, sample.usernames[0])
  }

  if (!user) {
    throw new Error(`Could not create or find ${sample.usernames.join("/")}`)
  }

  await api(accessToken, `/users/${user.id}`, {
    method: "PUT",
    body: JSON.stringify({
      ...user,
      firstName: sample.firstName,
      lastName: sample.lastName,
      enabled: sample.enabled,
      attributes: { ...user.attributes, ...attributes },
    }),
  })

  if (demoGroupId) {
    await api(accessToken, `/users/${user.id}/groups/${demoGroupId}`, {
      method: "PUT",
    })
  }

  return user.username
}

async function ensureAppRealm(accessToken) {
  const response = await fetch(`${base}/admin/realms/${realm}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (response.ok) {
    const current = await response.json()
    if (current.sslRequired !== sslRequired) {
      await fetch(`${base}/admin/realms/${realm}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: current.id,
          realm: current.realm,
          sslRequired,
        }),
      })
    }
    return
  }
  if (response.status !== 404) {
    throw new Error(`GET /admin/realms/${realm} ${response.status}`)
  }
  const created = await fetch(`${base}/admin/realms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      realm,
      displayName: "App template",
      enabled: true,
      sslRequired,
      registrationAllowed: false,
      resetPasswordAllowed: true,
      loginWithEmailAllowed: true,
    }),
  })
  if (!created.ok) {
    throw new Error(`Create realm ${realm} failed: ${created.status} ${await created.text()}`)
  }
  console.log(`Created template realm ${realm} (sslRequired=${sslRequired})`)
}

async function main() {
  const accessToken = await token()
  await ensureAppRealm(accessToken)
  await ensureUserProfile(accessToken)
  const sacco = await ensureGroup(accessToken, "sacco")
  const demo = await ensureGroup(accessToken, "demo-sacco", sacco.id)

  const realmMgmt = await api(accessToken, "/clients?clientId=realm-management")
  const clientUuid = realmMgmt[0]?.id
  const roles = await api(accessToken, `/clients/${clientUuid}/roles`)
  const needed = [
    "manage-groups",
    "view-groups",
    "query-groups",
    "manage-clients",
    "view-clients",
    "query-clients",
    "manage-realm",
    "view-realm",
  ]
    .map((name) => roles.find((role) => role.name === name))
    .filter(Boolean)

  const adminUser = await findUser(accessToken, "console-admin")
  if (adminUser && needed.length) {
    try {
      await api(
        accessToken,
        `/users/${adminUser.id}/role-mappings/clients/${clientUuid}`,
        { method: "POST", body: JSON.stringify(needed) },
      )
    } catch (error) {
      if (!String(error).includes("409")) throw error
    }
  }

  const seeded = []
  if (!seedDemoUsers) {
    console.log(`Skipping demo users in ${realm} (set KEYCLOAK_SEED_DEMO=1 to add them)`)
  }
  for (const sample of seedDemoUsers ? [
    {
      usernames: ["alice", "+256700000001"],
      phone: "+256700000001",
      firstName: "Alice",
      lastName: "Nguyen",
      email: "alice@example.com",
      enabled: true,
      clientId: "1001",
    },
    {
      usernames: ["bob", "+256700000002"],
      phone: "+256700000002",
      firstName: "Bob",
      lastName: "Okoye",
      email: "bob@example.com",
      enabled: true,
      clientId: "1002",
    },
    {
      usernames: ["carol", "+256700000003"],
      phone: "+256700000003",
      firstName: "Carol",
      lastName: "Diaz",
      email: "carol@example.com",
      enabled: false,
      clientId: "1003",
    },
  ] : []) {
    seeded.push(await upsertSelfHelpUser(accessToken, sample, demo?.id))
  }

  await ensureSelfHelpClient(accessToken, realm)
  await ensureKeycloakUiClient(accessToken, realm)
  const realms = await fetch(`${base}/admin/realms`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then((response) => response.json())
  for (const item of realms) {
    const name = item.realm
    if (!name || name === "master" || name === realm) continue
    await ensureSelfHelpClient(accessToken, name)
    await ensureKeycloakUiClient(accessToken, name)
  }
  await ensureMasterConsole(accessToken)
  console.log(
    seedDemoUsers
      ? `Seeded app template demo users (${seeded.join(", ")})`
      : `Seeded ${realm} template + master keycloak-ui (${consoleOrigin})`,
  )
}

const SELF_HELP_MAPPERS = [
  { name: "clientId", attribute: "clientId", claim: "clientId" },
  { name: "fineract_client_id", attribute: "fineract_client_id", claim: "fineract_client_id" },
  { name: "saccoId", attribute: "saccoId", claim: "saccoId" },
]

function selfHelpClientBody() {
  return {
    clientId: "self-help",
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
    protocolMappers: SELF_HELP_MAPPERS.map((mapper) => ({
      name: mapper.name,
      protocol: "openid-connect",
      protocolMapper: "oidc-usermodel-attribute-mapper",
      consentRequired: false,
      config: {
        "user.attribute": mapper.attribute,
        "claim.name": mapper.claim,
        "jsonType.label": "String",
        "id.token.claim": "true",
        "access.token.claim": "true",
        "userinfo.token.claim": "true",
        "introspection.token.claim": "true",
      },
    })),
  }
}

async function ensureSelfHelpClient(accessToken, targetRealm) {
  const found = await api(
    accessToken,
    "/clients?clientId=self-help",
    {},
    targetRealm,
  )
  if (!found[0]) {
    await api(
      accessToken,
      "/clients",
      { method: "POST", body: JSON.stringify(selfHelpClientBody()) },
      targetRealm,
    )
    console.log(`Seeded self-help client in ${targetRealm}`)
    return
  }

  const client = found[0]
  const mappers = await api(
    accessToken,
    `/clients/${client.id}/protocol-mappers/models`,
    {},
    targetRealm,
  )
  const names = new Set((Array.isArray(mappers) ? mappers : []).map((item) => item.name))
  for (const mapper of selfHelpClientBody().protocolMappers) {
    if (names.has(mapper.name)) continue
    await api(
      accessToken,
      `/clients/${client.id}/protocol-mappers/models`,
      { method: "POST", body: JSON.stringify(mapper) },
      targetRealm,
    )
  }
  if (!client.directAccessGrantsEnabled || !client.publicClient) {
    await api(
      accessToken,
      `/clients/${client.id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          ...client,
          publicClient: true,
          directAccessGrantsEnabled: true,
          serviceAccountsEnabled: false,
        }),
      },
      targetRealm,
    )
  }
}

const CONSOLE_SERVICE_ROLES = [
  "manage-users",
  "view-users",
  "query-users",
  "view-clients",
  "query-clients",
]

function fineractUiClientBody() {
  const origin = (process.env.FINERACT_UI_URL ?? "").replace(/\/$/, "")
  const redirectUris = ["http://localhost:*"]
  const webOrigins = ["+"]
  if (origin) {
    redirectUris.unshift(`${origin}/*`)
    webOrigins.unshift(origin)
  }
  return {
    clientId: "keycloak-ui",
    name: "Fineract UI",
    description: "Confidential client for officers to manage Self Help users.",
    enabled: true,
    publicClient: false,
    secret: process.env.AUTH_KEYCLOAK_SECRET ?? "keycloak-ui-dev-secret",
    protocol: "openid-connect",
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
  }
}

async function ensureConsoleServiceRoles(accessToken, targetRealm) {
  const serviceAccount = (
    await api(
      accessToken,
      `/users?username=${encodeURIComponent("service-account-keycloak-ui")}&exact=true`,
      {},
      targetRealm,
    )
  )[0]
  const [realmManagement] = await api(
    accessToken,
    "/clients?clientId=realm-management",
    {},
    targetRealm,
  )
  if (!serviceAccount?.id || !realmManagement?.id) return
  const available = await api(
    accessToken,
    `/clients/${realmManagement.id}/roles`,
    {},
    targetRealm,
  )
  const assigned = await api(
    accessToken,
    `/users/${serviceAccount.id}/role-mappings/clients/${realmManagement.id}`,
    {},
    targetRealm,
  )
  const have = new Set((Array.isArray(assigned) ? assigned : []).map((role) => role.name))
  const toAdd = (Array.isArray(available) ? available : []).filter(
    (role) => CONSOLE_SERVICE_ROLES.includes(role.name) && !have.has(role.name),
  )
  if (toAdd.length === 0) return
  await api(
    accessToken,
    `/users/${serviceAccount.id}/role-mappings/clients/${realmManagement.id}`,
    { method: "POST", body: JSON.stringify(toAdd) },
    targetRealm,
  )
}

async function ensureKeycloakUiClient(accessToken, targetRealm) {
  if (targetRealm === "master") return
  const found = await api(
    accessToken,
    "/clients?clientId=keycloak-ui",
    {},
    targetRealm,
  )
  if (!found[0]) {
    await api(
      accessToken,
      "/clients",
      { method: "POST", body: JSON.stringify(fineractUiClientBody()) },
      targetRealm,
    )
    console.log(`Seeded keycloak-ui client in ${targetRealm}`)
  } else {
    const client = found[0]
    if (!client.serviceAccountsEnabled || client.publicClient || client.enabled === false) {
      await api(
        accessToken,
        `/clients/${client.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            ...client,
            enabled: true,
            publicClient: false,
            serviceAccountsEnabled: true,
          }),
        },
        targetRealm,
      )
    }
  }
  const clients = await api(
    accessToken,
    "/clients?clientId=keycloak-ui",
    {},
    targetRealm,
  )
  if (clients[0]?.id) {
    await ensureConsoleServiceRoles(accessToken, targetRealm)
  }
}

function consoleClientBody(existing = {}) {
  const redirectUris = new Set([
    ...(existing.redirectUris ?? []),
    `${consoleOrigin}/api/auth/callback/keycloak`,
    "http://localhost:3000/api/auth/callback/keycloak",
  ])
  const webOrigins = new Set([
    ...(existing.webOrigins ?? []),
    consoleOrigin,
    "http://localhost:3000",
  ])
  const logoutUris = [
    existing.attributes?.["post.logout.redirect.uris"],
    `${consoleOrigin}/*`,
    "http://localhost:3000/*",
  ]
    .filter(Boolean)
    .join("##")
  return {
    ...existing,
    clientId: "keycloak-ui",
    name: existing.name ?? "Keycloak Admin UI",
    enabled: true,
    publicClient: false,
    secret: process.env.AUTH_KEYCLOAK_SECRET ?? existing.secret ?? "keycloak-ui-dev-secret",
    protocol: "openid-connect",
    rootUrl: consoleOrigin,
    baseUrl: consoleOrigin,
    redirectUris: [...redirectUris],
    webOrigins: [...webOrigins],
    standardFlowEnabled: true,
    implicitFlowEnabled: false,
    directAccessGrantsEnabled: false,
    serviceAccountsEnabled: true,
    fullScopeAllowed: true,
    attributes: {
      ...(existing.attributes ?? {}),
      "pkce.code.challenge.method": "S256",
      "post.logout.redirect.uris": logoutUris,
    },
  }
}

async function ensureMasterConsole(masterToken) {
  const clients = await api(
    masterToken,
    "/clients?clientId=keycloak-ui",
    {},
    "master",
  )
  if (!clients[0]) {
    await api(
      masterToken,
      "/clients",
      {
        method: "POST",
        body: JSON.stringify(consoleClientBody()),
      },
      "master",
    )
  } else {
    await api(
      masterToken,
      `/clients/${clients[0].id}`,
      {
        method: "PUT",
        body: JSON.stringify(consoleClientBody(clients[0])),
      },
      "master",
    )
  }

  let adminUser = (
    await api(
      masterToken,
      `/users?username=${encodeURIComponent("console-admin")}&exact=true`,
      {},
      "master",
    )
  )[0]

  if (!adminUser) {
    await api(
      masterToken,
      "/users",
      {
        method: "POST",
        body: JSON.stringify({
          username: "console-admin",
          enabled: true,
          emailVerified: true,
          firstName: "Console",
          lastName: "Admin",
          email: "console-admin@example.com",
          credentials: [
            { type: "password", value: "admin", temporary: false },
          ],
        }),
      },
      "master",
    )
    adminUser = (
      await api(
        masterToken,
        `/users?username=${encodeURIComponent("console-admin")}&exact=true`,
        {},
        "master",
      )
    )[0]
  }

  const masterClients = await api(
    masterToken,
    "/clients?clientId=keycloak-ui",
    {},
    "master",
  )
  const masterClient = masterClients[0]
  const masterClientId = masterClient?.id
  if (masterClientId) {
    if (!masterClient.serviceAccountsEnabled) {
      await api(
        masterToken,
        `/clients/${masterClientId}`,
        {
          method: "PUT",
          body: JSON.stringify({ ...masterClient, serviceAccountsEnabled: true }),
        },
        "master",
      )
    }
    const mappers = await api(
      masterToken,
      `/clients/${masterClientId}/protocol-mappers/models`,
      {},
      "master",
    )
    for (const mapper of Array.isArray(mappers) ? mappers : []) {
      if (mapper.name !== "realm-management-audience") continue
      await api(
        masterToken,
        `/clients/${masterClientId}/protocol-mappers/models/${mapper.id}`,
        { method: "DELETE" },
        "master",
      )
    }
  }

  if (!adminUser) {
    throw new Error("Could not create console-admin in master")
  }

  const roles = await api(masterToken, "/roles", {}, "master")
  const adminRole = roles.find((role) => role.name === "admin")
  const createRealmRole = roles.find((role) => role.name === "create-realm")
  const toAssign = [adminRole, createRealmRole].filter(Boolean)
  if (toAssign.length) {
    try {
      await api(
        masterToken,
        `/users/${adminUser.id}/role-mappings/realm`,
        { method: "POST", body: JSON.stringify(toAssign) },
        "master",
      )
    } catch (error) {
      if (!String(error).includes("409")) throw error
    }
  }

  const serviceAccount = (
    await api(
      masterToken,
      `/users?username=${encodeURIComponent("service-account-keycloak-ui")}&exact=true`,
      {},
      "master",
    )
  )[0]
  if (serviceAccount && toAssign.length) {
    try {
      await api(
        masterToken,
        `/users/${serviceAccount.id}/role-mappings/realm`,
        { method: "POST", body: JSON.stringify(toAssign) },
        "master",
      )
    } catch (error) {
      if (!String(error).includes("409")) throw error
    }
  }

  console.log("Seeded master keycloak-ui client and console-admin (admin)")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
