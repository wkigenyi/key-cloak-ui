"use client"

import { useTransition } from "react"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { PendingSubmitContent } from "@/components/admin/form-submit-button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ThemeModeTabs } from "@/components/admin/theme-mode-tabs"
import { useWorkspaceSwitch } from "@/components/admin/workspace-switch"
import { ChevronsUpDownIcon } from "lucide-react"

function SignOutMenuItem() {
  const [pending, startTransition] = useTransition()

  return (
    <DropdownMenuItem
      disabled={pending}
      aria-busy={pending}
      onClick={() => {
        startTransition(async () => {
          await signOut({ redirectTo: "/login" })
        })
      }}
    >
      <PendingSubmitContent pending={pending} pendingLabel="Signing out…">
        Sign out
      </PendingSubmitContent>
    </DropdownMenuItem>
  )
}

export function NavWorkspace({
  realm,
  userName,
  userEmail,
}: {
  realm: string
  userName?: string
  userEmail?: string
}) {
  const { switchingTo } = useWorkspaceSwitch()
  const currentRealm = switchingTo ?? realm
  const initials = (userName ?? currentRealm).charAt(0).toUpperCase()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                aria-label="Account menu"
                className="in-data-[state=collapsed]:justify-center"
              />
            }
          >
            <Avatar size="sm" className="shrink-0">
              <AvatarFallback className="bg-background border-border text-foreground border text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-medium in-data-[state=collapsed]:hidden">
              {userName ?? currentRealm}
            </span>
            <ChevronsUpDownIcon
              className="ml-auto size-3.5 opacity-60 in-data-[state=collapsed]:hidden"
              aria-hidden="true"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start" sideOffset={8}>
            <DropdownMenuGroup>
              <div className={cn("px-2 py-1.5")}>
                <p className="text-sm font-medium">{userName ?? "Signed in"}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {userEmail ?? currentRealm}
                </p>
              </div>
              <div className="py-2.5">
                <ThemeModeTabs />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>Realm: {currentRealm}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <SignOutMenuItem />
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
