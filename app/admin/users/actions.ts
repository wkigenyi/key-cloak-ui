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

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

export async function createUserAction(formData: FormData) {
  return withActionError(async () => {
    const username = formString(formData, "username")
    const clientId = formString(formData, "clientId")
    if (!username) {
      throw new Error("Username is required")
    }
    if (!clientId) {
      throw new Error("clientId is required")
    }

    const id = await createUser({
      username,
      clientId,
      phone: formString(formData, "phone") || undefined,
      email: formString(formData, "email") || undefined,
      firstName: formString(formData, "firstName") || undefined,
      lastName: formString(formData, "lastName") || undefined,
      enabled: formData.get("enabled") === "on",
      password: formString(formData, "password") || undefined,
      temporaryPassword: formData.get("temporaryPassword") === "on",
    })

    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${id}`)
    return { id }
  }, "Could not create user")
}

export async function updateUserAction(formData: FormData) {
  return withActionError(async () => {
    const id = formString(formData, "id")
    await updateUser(id, {
      username: formString(formData, "username") || undefined,
      email: formString(formData, "email") || undefined,
      firstName: formString(formData, "firstName") || undefined,
      lastName: formString(formData, "lastName") || undefined,
      enabled: formData.get("enabled") === "on",
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
  return withActionError(async () => {
    const id = formString(formData, "id")
    const password = formString(formData, "password")
    if (!password) {
      throw new Error("Password is required")
    }
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
