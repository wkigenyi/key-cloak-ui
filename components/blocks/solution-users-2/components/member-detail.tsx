"use client"

import { useState, type ReactNode } from "react"
import { Badge } from "@/components/reui/badge"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import type { AdminUser, UserDetail } from "@/lib/keycloak/admin"
import { AccessTabContent } from "./access-tab"
import { ActivityTabContent } from "./activity-tab"
import { AuthenticationTabContent } from "./authentication-tab"
import { DangerTabContent } from "./danger-tab"
import { SessionsTabContent } from "./sessions-tab"
import { UsersIcon, ShieldCheckIcon, MonitorIcon, ListChecksIcon, Trash2Icon } from "lucide-react"

type MemberTabValue =
  | "profile"
  | "authentication"
  | "sessions"
  | "activity"
  | "danger"

type MemberTabConfig = {
  value: MemberTabValue
  label: string
  icon: ReactNode
}

const MEMBER_TABS: MemberTabConfig[] = [
  {
    value: "profile",
    label: "Profile",
    icon: <UsersIcon aria-hidden="true" />,
  },
  {
    value: "authentication",
    label: "Authentication",
    icon: <ShieldCheckIcon aria-hidden="true" />,
  },
  {
    value: "sessions",
    label: "Sessions",
    icon: <MonitorIcon aria-hidden="true" />,
  },
  {
    value: "activity",
    label: "Activity",
    icon: <ListChecksIcon aria-hidden="true" />,
  },
  {
    value: "danger",
    label: "Danger zone",
    icon: <Trash2Icon aria-hidden="true" />,
  },
]

function DotSeparator() {
  return (
    <span
      className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
      aria-hidden="true"
    />
  )
}

function userDisplayName(user: AdminUser) {
  return (
    user.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username
  )
}

function userInitials(user: AdminUser) {
  const first = user.firstName?.trim()?.[0]
  const last = user.lastName?.trim()?.[0]
  if (first || last) return `${first ?? ""}${last ?? ""}`.toUpperCase()
  return userDisplayName(user).slice(0, 2).toUpperCase() || "?"
}

function formatWhen(iso: string) {
  if (!iso) return ""
  return new Date(iso).toLocaleString()
}

export function MemberDetail({
  detail,
  saccoId,
}: {
  detail: UserDetail
  saccoId: string
}) {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<MemberTabValue>("profile")
  const { user, createdAt, sessions, credentials, activity, canManage } = detail
  const name = userDisplayName(user)
  const subtitle = user.email || user.phone || user.username

  return (
    <div className="w-full max-w-4xl space-y-8">
      <header className="flex flex-wrap items-center gap-4 px-1">
        <Avatar className="size-14 border">
          <AvatarFallback className="text-sm font-medium">
            {userInitials(user)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
            <Badge variant={user.enabled ? "success-light" : "warning-light"}>
              {user.enabled ? "Active" : "Disabled"}
            </Badge>
            <Badge variant="secondary">
              {user.kind === "self-help" ? "Self Help" : "Operator"}
            </Badge>
          </div>
          <p className="text-muted-foreground flex items-center gap-1.5 truncate text-sm">
            <span className="truncate">{subtitle}</span>
            {user.username && subtitle !== user.username ? (
              <>
                <DotSeparator />
                <span className="truncate">{user.username}</span>
              </>
            ) : null}
            {createdAt ? (
              <>
                <DotSeparator />
                <span className="truncate">Created {formatWhen(createdAt)}</span>
              </>
            ) : null}
          </p>
        </div>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as MemberTabValue)}
        orientation={isMobile ? "horizontal" : "vertical"}
        className="w-full gap-5 lg:gap-8"
      >
        <SidebarRail isMobile={isMobile} activeValue={activeTab} />

        <div className="min-w-0 flex-1">
          <TabsContent value="profile" className="mt-0">
            <AccessTabContent
              user={user}
              saccoId={saccoId}
              canManage={canManage}
            />
          </TabsContent>
          <TabsContent value="authentication" className="mt-0">
            <AuthenticationTabContent
              userId={user.id}
              email={user.email}
              emailVerified={user.emailVerified}
              requiredActions={user.requiredActions}
              credentials={credentials}
              canManage={canManage}
            />
          </TabsContent>
          <TabsContent value="sessions" className="mt-0">
            <SessionsTabContent
              userId={user.id}
              sessions={sessions}
              canManage={canManage}
            />
          </TabsContent>
          <TabsContent value="activity" className="mt-0">
            <ActivityTabContent activity={activity} />
          </TabsContent>
          <TabsContent value="danger" className="mt-0">
            <DangerTabContent user={user} canManage={canManage} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

function SidebarRail({
  isMobile,
  activeValue,
}: {
  isMobile: boolean
  activeValue: MemberTabValue
}) {
  return (
    <div className={cn("min-w-0", isMobile ? "w-full" : "w-44 shrink-0")}>
      {isMobile ? (
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="h-auto w-max min-w-max justify-start gap-1 bg-transparent p-0">
            {MEMBER_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "w-full justify-start gap-3 px-3 py-1.5 shadow-none",
                  activeValue === tab.value ? "bg-muted!" : "bg-transparent"
                )}
              >
                {tab.icon}
                <span className="truncate">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      ) : (
        <TabsList className="h-auto w-full flex-col items-stretch gap-1 bg-transparent p-0">
          {MEMBER_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "w-full justify-start gap-3 px-3 py-1.5 shadow-none",
                activeValue === tab.value ? "bg-muted!" : "bg-transparent"
              )}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      )}
    </div>
  )
}
