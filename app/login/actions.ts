"use server"

import { signIn, signOut } from "@/auth"

export async function signInAction(callbackUrl?: string) {
  await signIn("keycloak", { redirectTo: callbackUrl || "/admin/users" })
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" })
}
