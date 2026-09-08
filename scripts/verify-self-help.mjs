/**
 * Exercise the self-help user model against a running Keycloak.
 * Mirrors create / list / edit / disable / reset that the admin UI performs.
 */
const base = process.env.KEYCLOAK_URL ?? "http://127.0.0.1:8080"
const realm = process.env.KEYCLOAK_REALM ?? "app"
const username = "+256799912345"

async function token() {
  const body = new URLSearchParams({
    username: "admin",
    password: "admin",
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
  if (!response.ok) throw new Error(`token ${response.status}`)
  return (await response.json()).access_token
}

async function api(accessToken, path, init = {}) {
  const response = await fetch(`${base}/admin/realms/${realm}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })
  const text = await response.text()
  if (!response.ok && response.status !== 409) {
    throw new Error(`${init.method ?? "GET"} ${path} ${response.status} ${text}`)
  }
  return text ? JSON.parse(text) : {}
}

async function findUser(accessToken, name) {
  const users = await api(
    accessToken,
    `/users?username=${encodeURIComponent(name)}&exact=true`,
  )
  return users[0]
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function main() {
  const accessToken = await token()
  const users = await api(accessToken, "/users?max=200&briefRepresentation=false")
  const selfHelp = users.filter((user) => user.attributes?.clientId?.[0])
  const operators = users.filter((user) => !user.attributes?.clientId?.[0])
  assert(selfHelp.length >= 3, `expected >=3 self-help users, got ${selfHelp.length}`)
  assert(
    operators.some((user) => user.username === "console-admin"),
    "console-admin should remain an operator",
  )
  assert(
    !operators.some((user) => user.username === "console-admin" && user.attributes?.clientId),
    "console-admin must not have clientId",
  )

  const alice = users.find(
    (user) =>
      user.username === "+256700000001" ||
      (user.username === "alice" && user.attributes?.clientId?.[0] === "1001"),
  )
  assert(alice?.attributes?.clientId?.[0] === "1001", "alice clientId")
  assert(alice?.attributes?.saccoId?.[0] === "demo-sacco", "alice saccoId")
  const existing = await findUser(accessToken, username)
  if (existing) {
    await fetch(`${base}/admin/realms/${realm}/users/${existing.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  }

  await fetch(`${base}/admin/realms/${realm}/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      firstName: "Verify",
      lastName: "User",
      email: "verify-self-help@example.com",
      enabled: true,
      attributes: {
        clientId: ["9090"],
        fineract_client_id: ["9090"],
        saccoId: [realm],
        phone: [username],
        displayName: ["Verify User"],
        provisioned_at: [new Date().toISOString()],
      },
      credentials: [
        { type: "password", value: "temp-pass", temporary: true },
      ],
    }),
  })

  let user = await findUser(accessToken, username)
  assert(user?.id, "created user")
  user = await api(accessToken, `/users/${user.id}`)
  assert(user.attributes.clientId[0] === "9090", "create clientId")
  assert(user.attributes.saccoId[0] === realm, "create saccoId")

  await fetch(`${base}/admin/realms/${realm}/users/${user.id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...user,
      firstName: "Verified",
      attributes: {
        ...user.attributes,
        clientId: ["9091"],
        fineract_client_id: ["9091"],
      },
    }),
  })
  user = await api(accessToken, `/users/${user.id}`)
  assert(user.firstName === "Verified", "edit firstName")
  assert(user.attributes.clientId[0] === "9091", "edit clientId")

  await fetch(`${base}/admin/realms/${realm}/users/${user.id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...user, enabled: false }),
  })
  user = await api(accessToken, `/users/${user.id}`)
  assert(user.enabled === false, "disable")

  const reset = await fetch(
    `${base}/admin/realms/${realm}/users/${user.id}/reset-password`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "password",
        value: "reset-pass",
        temporary: true,
      }),
    },
  )
  assert(reset.ok, `reset password ${reset.status}`)

  await fetch(`${base}/admin/realms/${realm}/users/${user.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  assert(!(await findUser(accessToken, username)), "cleanup")

  console.log(
    `ok: ${selfHelp.length} self-help, ${operators.length} operators; create/edit/disable/reset passed`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
