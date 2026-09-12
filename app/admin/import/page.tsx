import { UserImportPanel } from "@/components/admin/user-import-panel"
import { canManageUsers } from "@/lib/auth/roles"
import { requireUserManager } from "@/lib/auth/session"
import { MASTER_REALM, getWorkspaceRealm } from "@/lib/keycloak/workspace"

export const maxDuration = 60

export default async function ImportPage() {
  const session = await requireUserManager()
  const realm = await getWorkspaceRealm()

  return (
    <UserImportPanel
      realm={realm}
      canManage={canManageUsers(session.roles)}
      blocked={realm === MASTER_REALM}
    />
  )
}
