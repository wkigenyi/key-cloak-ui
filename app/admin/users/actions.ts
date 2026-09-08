"use server"

import { revalidatePath } from "next/cache"
import {
  createUser,
  resetUserPassword,
  setUserEnabled,
  updateUser,
} from "@/lib/keycloak/admin"

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

export async function createUserAction(formData: FormData) {
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
  return { id }
}

export async function updateUserAction(formData: FormData) {
  const id = formString(formData, "id")
  await updateUser(id, {
    email: formString(formData, "email") || undefined,
    firstName: formString(formData, "firstName") || undefined,
    lastName: formString(formData, "lastName") || undefined,
    enabled: formData.get("enabled") === "on",
    clientId: formString(formData, "clientId") || undefined,
    phone: formString(formData, "phone") || undefined,
  })
  revalidatePath("/admin/users")
}

export async function setUserEnabledAction(id: string, enabled: boolean) {
  await setUserEnabled(id, enabled)
  revalidatePath("/admin/users")
}

export async function resetUserPasswordAction(formData: FormData) {
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
}
