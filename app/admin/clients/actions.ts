"use server"

import { revalidatePath } from "next/cache"
import { withActionError } from "@/lib/keycloak/errors"
import {
  createClient,
  setClientEnabled,
  updateClient,
} from "@/lib/keycloak/oidc-clients"

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

function formChecked(formData: FormData, key: string) {
  return formData.get(key) === "on"
}

export async function createClientAction(formData: FormData) {
  return withActionError(async () => {
    const clientId = formString(formData, "clientId")
    if (!clientId) {
      throw new Error("Client ID is required")
    }

    const id = await createClient({
      clientId,
      name: formString(formData, "name") || undefined,
      description: formString(formData, "description") || undefined,
      rootUrl: formString(formData, "rootUrl") || undefined,
      redirectUris: formString(formData, "redirectUris") || undefined,
      webOrigins: formString(formData, "webOrigins") || undefined,
      publicClient: formChecked(formData, "publicClient"),
      enabled: formChecked(formData, "enabled"),
      standardFlowEnabled: formChecked(formData, "standardFlowEnabled"),
      directAccessGrantsEnabled: formChecked(formData, "directAccessGrantsEnabled"),
      serviceAccountsEnabled: formChecked(formData, "serviceAccountsEnabled"),
    })

    revalidatePath("/admin/clients")
    return { id }
  }, "Could not create client")
}

export async function updateClientAction(formData: FormData) {
  return withActionError(async () => {
    const id = formString(formData, "id")
    await updateClient(id, {
      name: formString(formData, "name") || undefined,
      description: formString(formData, "description") || undefined,
      rootUrl: formString(formData, "rootUrl") || undefined,
      redirectUris: formString(formData, "redirectUris"),
      webOrigins: formString(formData, "webOrigins"),
      publicClient: formChecked(formData, "publicClient"),
      enabled: formChecked(formData, "enabled"),
      standardFlowEnabled: formChecked(formData, "standardFlowEnabled"),
      directAccessGrantsEnabled: formChecked(formData, "directAccessGrantsEnabled"),
      serviceAccountsEnabled: formChecked(formData, "serviceAccountsEnabled"),
    })
    revalidatePath("/admin/clients")
  }, "Could not update client")
}

export async function setClientEnabledAction(id: string, enabled: boolean) {
  return withActionError(async () => {
    await setClientEnabled(id, enabled)
    revalidatePath("/admin/clients")
  }, "Could not update client")
}
