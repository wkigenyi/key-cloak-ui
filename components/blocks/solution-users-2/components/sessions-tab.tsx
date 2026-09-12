"use client"

import { Fragment, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { toast } from "sonner"
import {
  logoutUserSessionAction,
  logoutUserSessionsAction,
} from "@/app/admin/users/actions"
import { toastFormError } from "@/components/admin/form-action-error"
import { PendingSubmitContent } from "@/components/admin/form-submit-button"
import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import type { UserSessionInfo } from "@/lib/keycloak/admin"
import { MonitorIcon, LogOutIcon } from "lucide-react"

function formatWhen(iso: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString()
}

function DotSeparator() {
  return (
    <span
      className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
      aria-hidden="true"
    />
  )
}

export function SessionsTabContent({
  userId,
  sessions,
  canManage,
}: {
  userId: string
  sessions: UserSessionInfo[]
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function revokeOne(sessionId: string) {
    startTransition(async () => {
      const result = await logoutUserSessionAction(userId, sessionId)
      if (!result.ok) {
        toastFormError("Could not revoke session", result.error)
        return
      }
      toast.success("Session revoked")
      router.refresh()
    })
  }

  function revokeAll() {
    startTransition(async () => {
      const result = await logoutUserSessionsAction(userId)
      if (!result.ok) {
        toastFormError("Could not sign out sessions", result.error)
        return
      }
      toast.success("All sessions signed out")
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <Frame spacing="sm" className="text-foreground">
        <FrameHeader>
          <FrameTitle className="capitalize">Active Sessions</FrameTitle>
          <FrameDescription className="dark:text-foreground/70 flex items-center gap-1.5">
            <span>
              {sessions.length} signed in
            </span>
            {sessions[0]?.lastAccess ? (
              <>
                <DotSeparator />
                <span>Last seen {formatWhen(sessions[0].lastAccess)}</span>
              </>
            ) : null}
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
                      <Item className="border-background bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center border-2 p-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.14)] dark:border [&_svg]:size-4">
                        <MonitorIcon aria-hidden="true" />
                      </Item>
                    </ItemMedia>
                    <ItemContent className="min-w-0 gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <ItemTitle>
                          {session.clients[0] || "Keycloak session"}
                        </ItemTitle>
                        {session.clients.length > 1 ? (
                          <Badge variant="secondary">
                            {session.clients.length} clients
                          </Badge>
                        ) : null}
                      </div>
                      <ItemDescription className="flex items-center gap-1.5">
                        <span>{session.ip || "Unknown IP"}</span>
                        <DotSeparator />
                        <span>Started {formatWhen(session.startedAt)}</span>
                      </ItemDescription>
                      <p className="text-muted-foreground truncate text-sm">
                        Last seen {formatWhen(session.lastAccess)}
                      </p>
                    </ItemContent>
                    {canManage ? (
                      <ItemActions className="self-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() => revokeOne(session.id)}
                        >
                          Revoke
                        </Button>
                      </ItemActions>
                    ) : null}
                  </Item>
                </Fragment>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground py-8 text-center text-sm">
              No active sessions for this user.
            </div>
          )}
        </FramePanel>
        {canManage ? (
          <FrameFooter className="flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending || sessions.length === 0}
              aria-busy={pending}
              onClick={revokeAll}
            >
              <PendingSubmitContent pending={pending} pendingLabel="Signing out…">
                <LogOutIcon data-icon="inline-start" aria-hidden="true" />
                Sign out all sessions
              </PendingSubmitContent>
            </Button>
          </FrameFooter>
        ) : null}
      </Frame>
    </div>
  )
}
