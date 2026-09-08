import { AppShell } from "@/components/blocks/app-shell-2/components/app-shell"
import { requireSession } from "@/lib/auth/session"
import { listRealmNames } from "@/lib/keycloak/realms"
import { getWorkspaceRealm } from "@/lib/keycloak/workspace"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireSession()
  const realm = await getWorkspaceRealm()
  const realms = await listRealmNames()

  return (
    <AppShell
      realm={realm}
      realms={realms.length > 0 ? realms : [realm]}
      userName={session.user.name ?? undefined}
      userEmail={session.user.email ?? undefined}
    >
      {children}
    </AppShell>
  )
}
