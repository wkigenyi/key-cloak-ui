import { notFound } from "next/navigation"
import { RealmSettings } from "@/components/admin/realm-settings"
import { canManageRealm } from "@/lib/auth/roles"
import { requireRealmViewer } from "@/lib/auth/session"
import { getRealmSettings } from "@/lib/keycloak/realms"
import { isProtectedRealm } from "@/lib/keycloak/workspace"

export default async function RealmSettingsPage({
  params,
}: {
  params: Promise<{ realm: string }>
}) {
  const session = await requireRealmViewer()
  const { realm } = await params
  const name = decodeURIComponent(realm)
  const settings = await getRealmSettings(name)
  if (!settings) notFound()

  return (
    <RealmSettings
      realmName={name}
      canManage={canManageRealm(session.roles)}
      protectedRealm={isProtectedRealm(name)}
      realm={settings.realm}
      events={settings.events}
      keys={settings.keys}
      userProfile={settings.userProfile}
      clientPolicies={settings.clientPolicies}
      clientProfiles={settings.clientProfiles}
    />
  )
}
