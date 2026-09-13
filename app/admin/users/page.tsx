import { Suspense } from "react"
import { UserDirectoryControls } from "@/components/admin/user-directory-controls"
import { UsersDirectory } from "@/components/admin/users-directory"
import { getUser, listUsers } from "@/lib/keycloak/admin"
import { toMember } from "@/lib/keycloak/mappers"
import { getWorkspaceRealm } from "@/lib/keycloak/workspace"
import type { UserKind } from "@/lib/keycloak/self-help"

function parseKind(value?: string): UserKind {
  if (value === "operators" || value === "all" || value === "self-help") {
    return value
  }
  return "self-help"
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    enabled?: string
    page?: string
    kind?: string
    create?: string
    edit?: string
  }>
}) {
  const params = await searchParams
  const enabled =
    params.enabled === "true"
      ? true
      : params.enabled === "false"
        ? false
        : undefined
  const kind = parseKind(params.kind)
  const creating = params.create === "1"

  const [{ users, total, canManage }, editing] = await Promise.all([
    listUsers({
      search: params.q,
      enabled,
      kind,
    }),
    !creating && params.edit ? getUser(params.edit) : Promise.resolve(null),
  ])
  const realm = await getWorkspaceRealm()
  const user = editing?.user ?? null

  return (
    <div className="flex flex-col gap-3">
      <Suspense>
        <UserDirectoryControls kind={kind} />
      </Suspense>
      <Suspense>
        <UsersDirectory
          members={users.map(toMember)}
          total={total}
          canManage={canManage}
        realm={realm}
        user={user}
        />
      </Suspense>
    </div>
  )
}
