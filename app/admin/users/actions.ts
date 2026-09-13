"use server"

import { revalidatePath } from "next/cache"
import {
  createUser,
  deleteUser,
  logoutUserSession,
  logoutUserSessions,
  resetUserPassword,
  setUserEnabled,
  updateUser,
} from "@/lib/keycloak/admin"
import { asActionResult, withActionError } from "@/lib/keycloak/errors"
import {
  validateCreateUserFields,
  validatePasswordPair,
  validateUpdateUserFields,
} from "@/lib/keycloak/user-form"

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

export async function createUserAction(formData: FormData) {
  return asActionResult(async () => {
    const username = formString(formData, "username")
    const clientId = formString(formData, "clientId")
    const email = formString(formData, "email") || undefined
    const password = formString(formData, "password")
    const passwordConfirm = formString(formData, "passwordConfirm")
    const invalid = validateCreateUserFields({
      username,
      clientId,
      email,
      password,
      passwordConfirm,
    })
    if (invalid) throw new Error(invalid)

    const id = await createUser({
      username,
      clientId,
      phone: formString(formData, "phone") || undefined,
      email,
      firstName: formString(formData, "firstName") || undefined,
      lastName: formString(formData, "lastName") || undefined,
      enabled: formData.get("enabled") === "on",
      emailVerified: Boolean(email && formData.get("emailVerified") === "on"),
      password,
      temporaryPassword: formData.get("temporaryPassword") === "on",
    })

    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${id}`)
    return { id }
  }, "Could not create user")
}

export async function updateUserAction(formData: FormData) {
  return asActionResult(async () => {
    const id = formString(formData, "id")
    const email = formString(formData, "email") || undefined
    const invalid = validateUpdateUserFields({ email })
    if (invalid) throw new Error(invalid)

    await updateUser(id, {
      username: formString(formData, "username") || undefined,
      email,
      firstName: formString(formData, "firstName") || undefined,
      lastName: formString(formData, "lastName") || undefined,
      enabled: formData.get("enabled") === "on",
      emailVerified: Boolean(email && formData.get("emailVerified") === "on"),
      clientId: formString(formData, "clientId") || undefined,
      phone: formString(formData, "phone") || undefined,
    })
    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${id}`)
  }, "Could not update user")
}

export async function setUserEnabledAction(id: string, enabled: boolean) {
  return withActionError(async () => {
    await setUserEnabled(id, enabled)
    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${id}`)
  }, "Could not update user")
}

export async function resetUserPasswordAction(formData: FormData) {
  return asActionResult(async () => {
    const id = formString(formData, "id")
    const password = formString(formData, "password")
    const passwordConfirm = formString(formData, "passwordConfirm")
    const invalid = validatePasswordPair(password, passwordConfirm)
    if (invalid) throw new Error(invalid)
    await resetUserPassword(
      id,
      password,
      formData.get("temporaryPassword") === "on",
    )
    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${id}`)
  }, "Could not reset password")
}

export async function logoutUserSessionsAction(id: string) {
  return asActionResult(async () => {
    await logoutUserSessions(id)
    revalidatePath(`/admin/users/${id}`)
  }, "Could not sign out sessions")
}

export async function logoutUserSessionAction(id: string, sessionId: string) {
  return asActionResult(async () => {
    await logoutUserSession(id, sessionId)
    revalidatePath(`/admin/users/${id}`)
  }, "Could not revoke session")
}

export async function deleteUserAction(id: string) {
  return asActionResult(async () => {
    await deleteUser(id)
    revalidatePath("/admin/users")
  }, "Could not delete user")
}
