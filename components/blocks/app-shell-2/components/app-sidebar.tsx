import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar"

import { RealmSwitcher } from "@/components/admin/realm-switcher"
import { Logo } from "./logo"
import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import { NavWorkspace } from "./nav-workspace"
import { SearchForm } from "./search-form"

export function AppSidebar({
  realm,
  realms,
  userName,
  userEmail,
}: {
  realm: string
  realms?: string[]
  userName?: string
  userEmail?: string
}) {
  return (
    <Sidebar collapsible="icon" variant="floating">
      {/* Header */}
      <SidebarHeader className="flex flex-row items-center justify-between in-data-[state=collapsed]:flex-col in-data-[state=collapsed]:items-start in-data-[state=collapsed]:justify-center">
        <div className="inline-flex min-h-10 items-center gap-2 px-0.5 transition-all duration-200 ease-linear">
          <Logo />
          <span className="text-sm font-medium in-data-[state=collapsed]:hidden">
            Keycloak
          </span>
        </div>

        <SidebarTrigger className="opacity-60 hover:opacity-100 [&_svg]:transition-transform [&_svg]:duration-200 in-data-[state=collapsed]:[&_svg]:rotate-180" />
      </SidebarHeader>

      {/* Sidebar */}
      <SidebarContent>
        <div className="space-y-2 py-2 pt-2">
          <SearchForm />
          <div className="px-2 in-data-[state=collapsed]:hidden">
            <p className="text-muted-foreground mb-1 px-0.5 text-[11px] font-medium tracking-wide uppercase">
              Realm
            </p>
            <RealmSwitcher realm={realm} realms={realms ?? [realm]} />
          </div>
        </div>

        <NavMain />

        <div className="mt-auto">
          <NavSecondary />
        </div>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="px-1! in-data-[state=collapsed]:px-1!">
        <div className="px-2">
          <Separator />
        </div>
        <NavWorkspace realm={realm} userName={userName} userEmail={userEmail} />
      </SidebarFooter>
    </Sidebar>
  )
}