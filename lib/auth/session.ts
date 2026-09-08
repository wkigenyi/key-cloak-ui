import "server-only"

import { redirect } from "next/navigation"
import { auth } from "@/auth"
import {
  canCreateRealm,
  canManageClients,
  canManageRealm,
  canManageUsers,
  canViewClients,
  canViewRealms,
  canViewUsers,
} from "@/lib/auth/roles"

export async function getSession() {
  return auth()
}

export async function requireSession() {
  const session = await auth()
  if (!session?.user || !session.accessToken || session.error) {
    redirect("/login")
  }
  return session
}

export async function requireUserViewer() {
  const session = await requireSession()
  if (!canViewUsers(session.roles)) {
    redirect("/admin/forbidden")
  }
  return session
}

export async function requireUserManager() {
  const session = await requireSession()
  if (!canManageUsers(session.roles)) {
    redirect("/admin/forbidden")
  }
  return session
}

export async function requireClientViewer() {
  const session = await requireSession()
  if (!canViewClients(session.roles)) {
    redirect("/admin/forbidden")
  }
  return session
}

export async function requireClientManager() {
  const session = await requireSession()
  if (!canManageClients(session.roles)) {
    redirect("/admin/forbidden")
  }
  return session
}

export async function requireRealmViewer() {
  const session = await requireSession()
  if (!canViewRealms(session.roles)) {
    redirect("/admin/forbidden")
  }
  return session
}

export async function requireRealmManager() {
  const session = await requireSession()
  if (!canManageRealm(session.roles)) {
    redirect("/admin/forbidden")
  }
  return session
}

export async function requireRealmCreator() {
  const session = await requireSession()
  if (!canCreateRealm(session.roles)) {
    redirect("/admin/forbidden")
  }
  return session
}
