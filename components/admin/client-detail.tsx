"use client"

import { useState, type ReactNode } from "react"
import { Badge } from "@/components/reui/badge"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { ClientDangerTab } from "@/components/admin/client-danger-tab"
import { ClientMappersTab } from "@/components/admin/client-mappers-tab"
import { ClientSessionsTab } from "@/components/admin/client-sessions-tab"
import { ClientSettingsTab } from "@/components/admin/client-settings-tab"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  SELF_HELP_CLIENT_ID,
  type ClientDetail as ClientDetailData,
} from "@/lib/keycloak/oidc-client-types"
import {
  KeyRoundIcon,
  ListChecksIcon,
  MonitorIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react"

type ClientTabValue = "settings" | "mappers" | "sessions" | "danger"

const CLIENT_TABS: { value: ClientTabValue; label: string; icon: ReactNode }[] =
  [
    {
      value: "settings",
      label: "Settings",
      icon: <SettingsIcon aria-hidden="true" />,
    },
    {
      value: "mappers",
      label: "Mappers",
      icon: <ListChecksIcon aria-hidden="true" />,
    },
    {
      value: "sessions",
      label: "Sessions",
      icon: <MonitorIcon aria-hidden="true" />,
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

export function ClientDetail({ detail }: { detail: ClientDetailData }) {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<ClientTabValue>("settings")
  const { client, mappers, sessions, sessionCount, canManage } = detail
  const kind =
    client.clientId === SELF_HELP_CLIENT_ID
      ? "Self Help"
      : client.builtIn
        ? "Built-in"
        : "Application"

  return (
    <div className="w-full max-w-4xl space-y-8">
      <header className="flex flex-wrap items-center gap-4 px-1">
        <div className="bg-muted flex size-14 items-center justify-center rounded-full border">
          <KeyRoundIcon className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              {client.name}
            </h1>
            <Badge variant={client.enabled ? "success-light" : "warning-light"}>
              {client.enabled ? "Enabled" : "Disabled"}
            </Badge>
            <Badge variant="secondary">{kind}</Badge>
          </div>
          <p className="text-muted-foreground flex items-center gap-1.5 truncate text-sm">
            <span className="truncate">{client.clientId}</span>
            <DotSeparator />
            <span className="truncate">{client.protocol}</span>
            {client.rootUrl ? (
              <>
                <DotSeparator />
                <span className="truncate">{client.rootUrl}</span>
              </>
            ) : null}
          </p>
        </div>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ClientTabValue)}
        orientation={isMobile ? "horizontal" : "vertical"}
        className="w-full gap-5 lg:gap-8"
      >
        <SidebarRail isMobile={isMobile} activeValue={activeTab} />
        <div className="min-w-0 flex-1">
          <TabsContent value="settings" className="mt-0">
            <ClientSettingsTab client={client} canManage={canManage} />
          </TabsContent>
          <TabsContent value="mappers" className="mt-0">
            <ClientMappersTab
              client={client}
              mappers={mappers}
              canManage={canManage}
            />
          </TabsContent>
          <TabsContent value="sessions" className="mt-0">
            <ClientSessionsTab
              sessions={sessions}
              sessionCount={sessionCount}
            />
          </TabsContent>
          <TabsContent value="danger" className="mt-0">
            <ClientDangerTab client={client} canManage={canManage} />
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
  activeValue: ClientTabValue
}) {
  return (
    <div className={cn("min-w-0", isMobile ? "w-full" : "w-44 shrink-0")}>
      {isMobile ? (
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="h-auto w-max min-w-max justify-start gap-1 bg-transparent p-0">
            {CLIENT_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "w-full justify-start gap-3 px-3 py-1.5 shadow-none",
                  activeValue === tab.value ? "bg-muted!" : "bg-transparent",
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
          {CLIENT_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "w-full justify-start gap-3 px-3 py-1.5 shadow-none",
                activeValue === tab.value ? "bg-muted!" : "bg-transparent",
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
