"use client"

import { Fragment } from "react"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import type { ClientSessionInfo } from "@/lib/keycloak/oidc-clients"
import { MonitorIcon } from "lucide-react"

function formatWhen(iso: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString()
}

export function ClientSessionsTab({
  sessions,
  sessionCount,
}: {
  sessions: ClientSessionInfo[]
  sessionCount: number
}) {
  return (
    <Frame spacing="sm" className="text-foreground">
      <FrameHeader>
        <FrameTitle className="capitalize">Sessions</FrameTitle>
        <FrameDescription className="dark:text-foreground/70">
          {sessionCount === 0
            ? "No active sessions for this client."
            : `${sessionCount} active session${sessionCount === 1 ? "" : "s"}.`}
        </FrameDescription>
      </FrameHeader>
      <FramePanel className="px-5 py-2">
        {sessions.length > 0 ? (
          <div className="flex flex-col">
            {sessions.map((session, index) => (
              <Fragment key={session.id}>
                {index > 0 ? <Separator /> : null}
                <Item size="sm" className="px-0">
                  <ItemMedia variant="icon">
                    <MonitorIcon aria-hidden="true" />
                  </ItemMedia>
                  <ItemContent className="min-w-0 gap-1">
                    <ItemTitle>{session.username || "Signed-in user"}</ItemTitle>
                    <ItemDescription>
                      {session.ip || "Unknown IP"}
                      {" · "}
                      Last access {formatWhen(session.lastAccess)}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              </Fragment>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No sessions to show.
          </p>
        )}
      </FramePanel>
    </Frame>
  )
}
