/**
 * Verify a SACCO realm is ready to cut over, then print the hooks env to set.
 *
 * Does not write to hooks or freeze Supabase. Rollback: remove the name from
 * KEYCLOAK_CUTOVER on hooks so Self Help falls back to supabase_*.
 *
 * Usage:
 *   node scripts/cutover-sacco.mjs mengo
 *   KEYCLOAK_URL=https://auth.bankayo.io node scripts/cutover-sacco.mjs mengo
 */
const keycloak = (process.env.KEYCLOAK_URL ?? "http://127.0.0.1:8080").replace(/\/$/, "")
const sacco = (process.argv[2] ?? "").trim().toLowerCase()

if (!sacco || sacco.startsWith("--")) {
  console.error("Usage: node scripts/cutover-sacco.mjs <short_name>")
  process.exit(1)
}

async function masterToken() {
  const response = await fetch(`${keycloak}/realms/master/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      username: process.env.KEYCLOAK_ADMIN ?? "admin",
      password: process.env.KEYCLOAK_ADMIN_PASSWORD ?? "admin",
      grant_type: "password",
      client_id: "admin-cli",
    }),
  })
  const body = await response.json()
  if (!body.access_token) {
    throw new Error(`Master token failed: ${response.status}`)
  }
  return body.access_token
}

async function main() {
  const token = await masterToken()
  const headers = { Authorization: `Bearer ${token}` }
  const realm = await fetch(`${keycloak}/admin/realms/${sacco}`, { headers })
  if (!realm.ok) {
    throw new Error(`Realm ${sacco} is missing (${realm.status}). Create SACCO first.`)
  }
  const representation = await realm.json()
  const clients = await fetch(
    `${keycloak}/admin/realms/${sacco}/clients?clientId=self-help`,
    { headers },
  )
  const list = await clients.json()
  if (!list[0]) {
    throw new Error(`Realm ${sacco} has no self-help client. Run pnpm seed:self-help.`)
  }
  const count = await fetch(`${keycloak}/admin/realms/${sacco}/users/count`, {
    headers,
  }).then((response) => response.json())
  const sslRequired = representation.sslRequired ?? "external"

  const issuer = `${keycloak}/realms/${sacco}`
  console.log(
    JSON.stringify(
      {
        ready: true,
        realm: sacco,
        issuer,
        client_id: "self-help",
        sslRequired,
        users: count,
        hooksEnv: {
          KEYCLOAK_URL: keycloak,
          KEYCLOAK_CUTOVER: sacco,
          KEYCLOAK_SELF_HELP_CLIENT_ID: "self-help",
        },
        next: [
          `Set KEYCLOAK_URL and KEYCLOAK_CUTOVER=${sacco} (or append to a comma list) on hooks.bankayo.io`,
          "Deploy Self Help that prefers issuer over supabase_*",
          "Point bankayo-ui KEYCLOAK_URL + service-account secret at this Keycloak",
          "Stop creating/updating users in this SACCO’s Supabase",
          "Production: set realm sslRequired=external (local HTTP is none)",
          "Rollback: remove this name from KEYCLOAK_CUTOVER",
        ],
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})