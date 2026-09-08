import { Suspense } from "react"
import { RealmsDirectory } from "@/components/admin/realms-directory"
import { listRealms } from "@/lib/keycloak/realms"
import { getWorkspaceRealm } from "@/lib/keycloak/workspace"

export default async function RealmsPage() {
  const [{ realms, total, canManage, canCreate }, workspace] = await Promise.all(
    [listRealms(), getWorkspaceRealm()],
  )

  return (
    <Suspense>
      <RealmsDirectory
        realms={realms}
        total={total}
        canManage={canManage}
        canCreate={canCreate}
        workspace={workspace}
      />
    </Suspense>
  )
}
