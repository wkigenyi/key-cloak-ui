"use server"

import { revalidatePath } from "next/cache"
import { canViewRealms } from "@/lib/auth/roles"
import { requireSession } from "@/lib/auth/session"
import { asActionResult } from "@/lib/keycloak/errors"
import {
  defaultWorkspaceRealm,
  setWorkspaceRealmCookie,
} from "@/lib/keycloak/workspace"

export async function switchWorkspaceAction(realm: string) {
  return asActionResult(async () => {
    const session = await requireSession()
    if (!canViewRealms(session.roles) && realm !== defaultWorkspaceRealm()) {
      throw new Error("You cannot switch realms.")
    }
    await setWorkspaceRealmCookie(realm)
    revalidatePath("/admin", "layout")
  }, "Could not switch SACCO")
}
