"use client"

import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline"
import { cn } from "@/lib/utils"
import type { UserActivityInfo } from "@/lib/keycloak/admin"
import { KeyRoundIcon, ListChecksIcon, LogInIcon, LogOutIcon } from "lucide-react"

function formatWhen(iso: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString()
}

function eventIcon(type: string) {
  if (type.includes("LOGIN")) return <LogInIcon aria-hidden="true" />
  if (type.includes("LOGOUT")) return <LogOutIcon aria-hidden="true" />
  if (type.includes("PASSWORD") || type.includes("UPDATE_CREDENTIAL")) {
    return <KeyRoundIcon aria-hidden="true" />
  }
  return <ListChecksIcon aria-hidden="true" />
}

function eventLabel(type: string) {
  return type.replaceAll("_", " ").toLowerCase()
}

export function ActivityTabContent({
  activity,
}: {
  activity: UserActivityInfo[]
}) {
  return (
    <div className="space-y-4">
      <Frame spacing="sm" className="text-foreground">
        <FrameHeader>
          <FrameTitle className="capitalize">Activity Timeline</FrameTitle>
          <FrameDescription className="dark:text-foreground/70">
            {activity.length} realm event{activity.length === 1 ? "" : "s"}
            {activity.length ? " · newest first" : ""}
          </FrameDescription>
        </FrameHeader>
        <FramePanel>
          {activity.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No realm events for this user. Enable user events on the realm to
              record sign-ins here.
            </p>
          ) : (
            <Timeline defaultValue={0}>
              {activity.map((item, index) => (
                <TimelineItem
                  key={item.id}
                  step={index + 1}
                  className="has-[+[data-completed]]:[&_[data-slot=timeline-separator]]:bg-border group-data-[orientation=vertical]/timeline:ms-12 group-data-[orientation=vertical]/timeline:not-last:pb-8"
                >
                  <TimelineHeader className="flex min-w-0 items-center justify-between gap-2.5">
                    <TimelineSeparator className="bg-border group-data-[orientation=vertical]/timeline:-left-7 group-data-[orientation=vertical]/timeline:h-[calc(100%-2.75rem)] group-data-[orientation=vertical]/timeline:translate-y-9" />
                    <TimelineIndicator className="border-background bg-muted text-muted-foreground flex size-7 items-center justify-center border-2 shadow-[0_1px_3px_0_rgba(0,0,0,0.14)] group-data-[orientation=vertical]/timeline:-left-7 dark:border [&_svg]:size-4">
                      {eventIcon(item.type)}
                    </TimelineIndicator>
                    <TimelineTitle className="min-w-0 text-sm leading-5 capitalize">
                      {eventLabel(item.type)}
                    </TimelineTitle>
                    {item.error ? (
                      <Badge variant="destructive-light" className="shrink-0">
                        Failed
                      </Badge>
                    ) : null}
                  </TimelineHeader>
                  <TimelineContent className="flex min-w-0 flex-col items-start gap-2 pb-1">
                    {item.ip || item.error ? (
                      <p className={cn("text-muted-foreground max-w-[60ch] text-sm leading-5")}>
                        {[item.ip, item.error].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    <TimelineDate dateTime={item.time} className="mb-0">
                      {formatWhen(item.time)}
                    </TimelineDate>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          )}
        </FramePanel>
      </Frame>
    </div>
  )
}
