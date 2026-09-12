"use server"

import { redirect } from "next/navigation"
import { signIn, signOut } from "@/auth"

export async function signInAction(callbackUrl?: string) {
  await signIn("keycloak", { redirectTo: callbackUrl || "/admin/users" })
}

export async function signOutAction() {
  try {
    await signOut({ redirect: false })
  } catch (error) {
    const digest =
      error && typeof error === "object" && "digest" in error
        ? String((error as { digest?: unknown }).digest)
        : ""
    if (digest.startsWith("NEXT_REDIRECT")) throw error
  }
  redirect("/login")
}
