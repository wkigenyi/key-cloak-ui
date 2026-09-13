import { redirect } from "next/navigation"
import { Suspense } from "react"
import { ClientDirectoryControls } from "@/components/admin/client-directory-controls"
import { ClientsDirectory } from "@/components/admin/clients-directory"
import { getWorkspaceRealm } from "@/lib/keycloak/workspace"
import { listClients, type ClientKind } from "@/lib/keycloak/oidc-clients"

function parseKind(value?: string): ClientKind {
  if (value === "built-in" || value === "all" || value === "applications") {
    return value
  }
  return "applications"
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    kind?: string
    enabled?: string
    page?: string
    create?: string
    edit?: string
  }>
}) {
  const params = await searchParams
  const kind = parseKind(params.kind)
  const page = Math.max(0, Number(params.page ?? 0) || 0)
  const enabled =
    params.enabled === "true"
      ? true
      : params.enabled === "false"
        ? false
        : undefined
  const creating = params.create === "1"
  if (!creating && params.edit) {
    redirect(`/admin/clients/${params.edit}`)
  }

  const [{ clients, total, canManage }, realm] = await Promise.all([
    listClients({
      kind,
      enabled,
      first: page * 50,
      max: 50,
    }),
    getWorkspaceRealm(),
  ])

  return (
    <div className="flex flex-col gap-3">
      <Suspense>
        <ClientDirectoryControls kind={kind} />
      </Suspense>
      <Suspense>
        <ClientsDirectory
          clients={clients}
          total={total}
          canManage={canManage}
          realm={realm}
        />
      </Suspense>
    </div>
  )
}
