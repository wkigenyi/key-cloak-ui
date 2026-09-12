"use server"

import { revalidatePath } from "next/cache"
import {
  createRealm,
  deleteRealm,
  setRealmEnabled,
  updateRealm,
  updateRealmClientPolicies,
  updateRealmEvents,
  updateRealmUserProfile,
} from "@/lib/keycloak/realms"
import { asActionResult, withActionError } from "@/lib/keycloak/errors"
import { setWorkspaceRealmCookie } from "@/lib/keycloak/workspace"
import type RealmRepresentation from "@keycloak/keycloak-admin-client/lib/defs/realmRepresentation"
import type { RealmEventsConfigRepresentation } from "@keycloak/keycloak-admin-client/lib/defs/realmEventsConfigRepresentation"
import type { UserProfileConfig } from "@keycloak/keycloak-admin-client/lib/defs/userProfileMetadata"
import type ClientPoliciesRepresentation from "@keycloak/keycloak-admin-client/lib/defs/clientPoliciesRepresentation"
import type ClientProfilesRepresentation from "@keycloak/keycloak-admin-client/lib/defs/clientProfilesRepresentation"

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

function formChecked(formData: FormData, key: string) {
  return formData.get(key) === "on"
}

function formNumber(formData: FormData, key: string) {
  const raw = formString(formData, key)
  if (!raw) return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

export async function createRealmAction(formData: FormData) {
  return asActionResult(async () => {
    const realm = await createRealm({
      realm: formString(formData, "realm"),
      displayName: formString(formData, "displayName") || undefined,
      enabled: formChecked(formData, "enabled"),
    })
    await setWorkspaceRealmCookie(realm)
    revalidatePath("/admin/realms")
    revalidatePath("/admin/users")
    return { realm }
  }, "Could not create realm")
}

export async function setRealmEnabledAction(realm: string, enabled: boolean) {
  return withActionError(async () => {
    await setRealmEnabled(realm, enabled)
    revalidatePath("/admin/realms")
    revalidatePath("/admin", "layout")
  }, "Could not update realm")
}

export async function deleteRealmAction(realm: string) {
  return withActionError(async () => {
    await deleteRealm(realm)
    revalidatePath("/admin/realms")
    revalidatePath("/admin", "layout")
  }, "Could not delete realm")
}

export async function updateRealmSettingsAction(
  realm: string,
  patch: Partial<RealmRepresentation>,
) {
  return withActionError(async () => {
    await updateRealm(realm, patch)
    revalidatePath("/admin/realms")
    revalidatePath(`/admin/realms/${realm}`)
  }, "Could not save realm settings")
}

export async function updateRealmEventsAction(
  realm: string,
  config: RealmEventsConfigRepresentation,
) {
  return withActionError(async () => {
    await updateRealmEvents(realm, config)
    revalidatePath(`/admin/realms/${realm}`)
  }, "Could not save events")
}

export async function updateRealmUserProfileAction(
  realm: string,
  profile: UserProfileConfig,
) {
  return asActionResult(async () => {
    await updateRealmUserProfile(realm, profile)
    revalidatePath(`/admin/realms/${realm}`)
  }, "Could not save user profile")
}

export async function updateRealmClientPoliciesAction(
  realm: string,
  input: {
    policies?: ClientPoliciesRepresentation
    profiles?: ClientProfilesRepresentation
  },
) {
  return withActionError(async () => {
    await updateRealmClientPolicies(realm, input)
    revalidatePath(`/admin/realms/${realm}`)
  }, "Could not save client policies")
}
