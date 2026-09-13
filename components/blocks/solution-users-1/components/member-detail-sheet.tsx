"use client"

import { type ReactNode } from "react"
import { toast } from "sonner"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { dockedSheetClassName } from "@/components/admin/sheet-layout"
import { RoleBadge, StatusBadge } from "./columns"
import { type IMember } from "./data"
import { XIcon, PencilIcon } from "lucide-react"

const mutedIconButtonClassName = "text-muted-foreground hover:text-foreground"

function DetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3 px-4 py-1">
      <span className="text-muted-foreground shrink-0 text-sm">{label}</span>
      <span className="flex min-w-0 items-center justify-end gap-1.5 text-sm font-medium">
        {children}
      </span>
    </div>
  )
}

export function MemberDetailSheet({
  member,
  open,
  onOpenChange,
}: {
  member: IMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={dockedSheetClassName}
      >
        {/* Header */}
        <SheetHeader className="bg-background shrink-0 p-0">
          <div className="flex min-h-14 items-center justify-between gap-2 border-b px-4">
            <SheetTitle className="min-w-0 truncate text-base font-semibold">
              Member Profile
            </SheetTitle>
            <SheetClose
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close sheet"
                  className={mutedIconButtonClassName}
                >
                  <XIcon aria-hidden="true" />
                </Button>
              }
            />
          </div>
          <SheetDescription className="sr-only">
            Review role, teams, and authentication for this member.
          </SheetDescription>
        </SheetHeader>

        {/* Content */}
        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            {member ? (
              <div className="flex min-h-full flex-col pb-6">
                <div className="flex items-center gap-3 px-4 py-5">
                  <Avatar className="size-12 shrink-0">
                    <AvatarImage src={member.avatar} alt="" />
                    <AvatarFallback>
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-foreground truncate text-sm font-semibold">
                      {member.name}
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                      {member.title}
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                      {member.email}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-0 border-t pt-1">
                  <DetailRow label="Role">
                    <RoleBadge role={member.role} />
                  </DetailRow>
                  <DetailRow label="Status">
                    <StatusBadge status={member.status} />
                  </DetailRow>
                  <DetailRow label="Permission scope">{member.scope}</DetailRow>
                  <DetailRow label="Teams">
                    <span className="truncate">{member.teams.join(", ")}</span>
                  </DetailRow>
                  <DetailRow label="Sign-in">
                    {member.auth === "SSO"
                      ? (member.ssoProvider ?? "SSO")
                      : "Password"}
                  </DetailRow>
                  <DetailRow label="Two-factor">
                    {member.twoFactor ?? "Not enrolled"}
                  </DetailRow>
                  <DetailRow label="Provisioning">
                    {member.provisioning}
                  </DetailRow>
                  <DetailRow label="Seat">{member.seatLabel}</DetailRow>
                  <DetailRow label="Last active">{member.lastActive}</DetailRow>
                  <DetailRow label="Member ID">
                    <span className="truncate font-mono text-xs">
                      {member.id}
                    </span>
                  </DetailRow>
                </div>
              </div>
            ) : null}
          </ScrollArea>
        </div>

        {/* Footer */}
        <SheetFooter className="bg-background mt-0 shrink-0 border-t">
          <div className="flex w-full gap-2">
            <Button
              type="button"
              className="min-w-0 flex-1"
              onClick={() => {
                if (!member) return
                toast.info("Role editor", {
                  description: `Update ${member.name} from ${member.role}. Demo only.`,
                })
              }}
            >
              <PencilIcon aria-hidden="true" />
              Edit role
            </Button>
            <SheetClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-0 flex-1"
                >
                  Close
                </Button>
              }
            />
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}