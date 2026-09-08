import "server-only"

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function getKeycloakConfig() {
  return {
    url: required("KEYCLOAK_URL").replace(/\/$/, ""),
    realm: required("KEYCLOAK_REALM"),
    issuer: required("AUTH_KEYCLOAK_ISSUER").replace(/\/$/, ""),
    clientId: required("AUTH_KEYCLOAK_ID"),
    clientSecret: required("AUTH_KEYCLOAK_SECRET"),
  }
}
