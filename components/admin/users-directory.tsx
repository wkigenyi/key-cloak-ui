"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { UserFormSheet } from "@/components/admin/user-form-sheet"
import { withSheetParams } from "@/components/admin/sheet-params"
import { WorkspaceSwitchReady } from "@/components/admin/workspace-switch"
import { MembersGrid } from "@/components/blocks/solution-users-1/components/members-grid"
import type { IMember } from "@/components/blocks/solution-users-1/components/data"
import type { AdminUser } from "@/lib/keycloak/admin"

export function UsersDirectory({
  members,
  total,
  canManage,
  realm,
  user,
}: {
  members: IMember[]
  total: number
  canManage: boolean
  realm: string
  user: AdminUser | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setSheet(next: { create?: boolean; edit?: string | null }) {
    const query = withSheetParams(searchParams, next)
    router.replace(query ? `/admin/users?${query}` : "/admin/users")
  }

  return (
    <>
      <WorkspaceSwitchReady realm={realm} />
      <MembersGrid
        members={members}
        total={total}
        canManage={canManage}
        realm={realm}
        onCreate={() => setSheet({ create: true })}
        onView={(member) => router.push(`/admin/users/${member.id}`)}
        onEdit={(member) => setSheet({ edit: member.id })}
      />
      <UserFormSheet user={user} canManage={canManage} saccoId={realm} />
    </>
  )
}
