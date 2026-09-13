import { normalizeImportEmail } from "@/lib/import/user-file"
import { isOperatorUsername } from "@/lib/keycloak/self-help"

export function passwordsMatch(password: string, confirm: string) {
  return password === confirm
}

export function validateEmailValue(email: string) {
  if (!email.trim()) return undefined
  if (!normalizeImportEmail(email)) return "Email is invalid"
  return undefined
}

export function validatePasswordPair(password: string, confirm: string) {
  if (!password) return "Password is required"
  if (!confirm) return "Confirm the password"
  if (!passwordsMatch(password, confirm)) return "Passwords do not match"
  return undefined
}

export function validateCreateUserFields(input: {
  username: string
  clientId: string
  email?: string
  password: string
  passwordConfirm: string
}) {
  if (!input.username.trim()) return "Username is required"
  if (isOperatorUsername(input.username.trim())) {
    return "That username is reserved for console operators."
  }
  if (!input.clientId.trim()) return "clientId is required"
  return (
    validateEmailValue(input.email ?? "") ??
    validatePasswordPair(input.password, input.passwordConfirm)
  )
}

export function validateUpdateUserFields(input: { email?: string }) {
  return validateEmailValue(input.email ?? "")
}
