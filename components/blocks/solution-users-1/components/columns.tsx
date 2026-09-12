"use client"

import { memo, useState, useTransition } from "react"
import { Badge } from "@/components/reui/badge"
import { type DataGridFeatures } from "@/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import {
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from "@/components/reui/data-grid/data-grid-table"
import { Row, type ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { PendingSubmitContent } from "@/components/admin/form-submit-button"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  MemberRole,
  MemberStatus,
  TEAM_LABELS,
  type AuthMethod,
  type IMember,
  type TeamLabel,
  type TwoFactor,
} from "./data"
import { ShieldCheckIcon, LockIcon, TriangleAlertIcon, KeyRoundIcon, MoreHorizontalIcon, EyeIcon, PencilIcon, SendIcon, PauseCircleIcon, Trash2Icon } from "lucide-react"

// ── Team tag colors (light + dark) ──

const teamBadgeClass: Record<TeamLabel, string> = {
  Engineering:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300",
  Product:
    "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300",
  Design: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
  Sales:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  Marketing:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  "Customer Success":
    "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300",
  Finance:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300",
  "IT/Security":
    "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
}

function getTeamClasses(tag: string): string {
  if (TEAM_LABELS.includes(tag as TeamLabel)) {
    return teamBadgeClass[tag as TeamLabel]
  }
  return "bg-muted text-muted-foreground"
}

export const TeamTags = memo(function TeamTags({
  teams,
}: {
  teams: TeamLabel[]
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {teams.map((team) => (
        <Badge
          key={team}
          variant="secondary"
          className={cn("border-0", getTeamClasses(team))}
        >
          {team}
        </Badge>
      ))}
    </div>
  )
})

// ── Status badge ──

const statusConfig: Record<MemberStatus, { dot: string }> = {
  Active: { dot: "bg-emerald-500" },
  Invited: { dot: "bg-amber-500" },
  Suspended: { dot: "bg-red-500" },
  Deactivated: { dot: "bg-muted-foreground" },
}

export function StatusBadge({ status }: { status: MemberStatus }) {
  return (
    <Badge variant="outline">
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full!",
          statusConfig[status].dot
        )}
      />
      {status}
    </Badge>
  )
}

// ── Role badge ──

const roleConfig: Record<
  MemberRole,
  { variant: React.ComponentProps<typeof Badge>["variant"] }
> = {
  Owner: { variant: "primary-outline" },
  Admin: { variant: "info-outline" },
  Member: { variant: "secondary" },
  Billing: { variant: "warning-outline" },
  Guest: { variant: "outline" },
  "Support Agent": { variant: "secondary" },
}

export function RoleBadge({ role }: { role: MemberRole }) {
  return <Badge variant={roleConfig[role].variant}>{role}</Badge>
}

// ── Member cell (same layout as the donor ContactCell) ──

const MemberCell = memo(function MemberCell({
  row,
}: {
  row: Row<DataGridFeatures, IMember>
}) {
  const o = row.original

  return (
    <div className="flex items-center gap-2">
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={o.avatar} alt="" />
        <AvatarFallback>
          {o.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="text-foreground line-clamp-1 font-medium">{o.name}</div>
        <div
          className="text-muted-foreground line-clamp-1 text-xs"
          title={o.email}
        >
          {o.email}
        </div>
      </div>
    </div>
  )
})

// ── Auth cell (SSO / 2FA badges) ──

const authBadgeVariant: Record<
  AuthMethod,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  SSO: "success-outline",
  Password: "warning-outline",
}

const twoFactorBadgeVariant: Record<
  TwoFactor,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  Authenticator: "info-outline",
  Passkey: "success-outline",
  "Security key": "success-outline",
  SMS: "warning-outline",
}

function AuthMethodIcon({ auth }: { auth: AuthMethod }) {
  if (auth === "SSO") {
    return (
      <ShieldCheckIcon aria-hidden="true" />
    )
  }

  return (
    <LockIcon aria-hidden="true" />
  )
}

function TwoFactorIcon({ factor }: { factor: TwoFactor | null }) {
  if (!factor) {
    return (
      <TriangleAlertIcon aria-hidden="true" />
    )
  }

  return (
    <KeyRoundIcon aria-hidden="true" />
  )
}

function AuthCell({ row }: { row: Row<DataGridFeatures, IMember> }) {
  const { auth, ssoProvider, twoFactor } = row.original

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Badge variant={authBadgeVariant[auth]}>
        <AuthMethodIcon auth={auth} />
        {auth === "SSO" ? (ssoProvider ?? "SSO") : "Password"}
      </Badge>
      <Badge
        variant={
          twoFactor ? twoFactorBadgeVariant[twoFactor] : "destructive-outline"
        }
      >
        <TwoFactorIcon factor={twoFactor} />
        {twoFactor ?? "No 2FA"}
      </Badge>
    </div>
  )
}

// ── Actions cell ──

export function ActionsCell({
  row,
  onEditRole,
  onView,
  onToggleEnabled,
  onResetPassword,
  canManage,
}: {
  row: Row<DataGridFeatures, IMember>
  onEditRole: (member: IMember) => void
  onView: (member: IMember) => void
  onToggleEnabled?: (member: IMember) => void
  onResetPassword?: (
    member: IMember,
    password: string,
    temporary: boolean,
  ) => Promise<void> | void
  canManage?: boolean
}) {
  const [resetOpen, setResetOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [resetPending, startReset] = useTransition()
  const member = row.original
  const enabled = member.status === "Active"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label="Row actions"
            />
          }
        >
          <MoreHorizontalIcon aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end" className="w-44">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => onView(member)}>
              <EyeIcon className="size-4" aria-hidden="true" />
              View profile
            </DropdownMenuItem>
            {canManage ? (
              <DropdownMenuItem onClick={() => onEditRole(member)}>
                <PencilIcon className="size-4" aria-hidden="true" />
                Edit user
              </DropdownMenuItem>
            ) : null}
            {canManage ? (
              <DropdownMenuItem onClick={() => setResetOpen(true)}>
                <KeyRoundIcon className="size-4" aria-hidden="true" />
                Reset password
              </DropdownMenuItem>
            ) : null}
            {canManage ? (
              <DropdownMenuItem onClick={() => onToggleEnabled?.(member)}>
                <PauseCircleIcon className="size-4" aria-hidden="true" />
                {enabled ? "Disable" : "Enable"}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset password</AlertDialogTitle>
            <AlertDialogDescription>
              Set a new password for{" "}
              <span className="text-foreground font-medium">{member.name}</span>
              . It will be temporary by default.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-4">
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="New password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="border-input bg-background h-8 w-full rounded-lg border px-2.5 text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!password || resetPending}
              aria-busy={resetPending}
              onClick={(event) => {
                event.preventDefault()
                startReset(async () => {
                  await onResetPassword?.(member, password, true)
                  setPassword("")
                  setResetOpen(false)
                })
              }}
            >
              <PendingSubmitContent pending={resetPending} pendingLabel="Resetting…">
                Reset
              </PendingSubmitContent>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ── Column definitions ──

interface ColumnHandlers {
  onEditRole: (member: IMember) => void
  onView: (member: IMember) => void
  onToggleEnabled?: (member: IMember) => void
  onResetPassword?: (
    member: IMember,
    password: string,
    temporary: boolean,
  ) => Promise<void> | void
  canManage?: boolean
}

export function createMemberColumns({
  onEditRole,
  onView,
  onToggleEnabled,
  onResetPassword,
  canManage,
}: ColumnHandlers): ColumnDef<DataGridFeatures, IMember>[] {
  return [
    {
      id: "select",
      header: () => <DataGridTableRowSelectAll />,
      cell: ({ row }) => <DataGridTableRowSelect row={row} />,
      enableSorting: false,
      size: 40,
      enableResizing: false,
      enableHiding: false,
      meta: {
        skeleton: <Skeleton className="mx-auto size-5" />,
      },
    },
    {
      accessorKey: "name",
      id: "name",
      header: ({ column }) => (
        <DataGridColumnHeader
          title="Member"
          visibility={true}
          column={column}
        />
      ),
      cell: ({ row }) => <MemberCell row={row} />,
      enableSorting: true,
      enableHiding: false,
      enableResizing: true,
      minSize: 220,
      meta: {
        headerTitle: "Member",
        autoSize: true,
        skeleton: (
          <div className="flex min-w-0 items-center gap-2">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ),
      },
    },
    {
      accessorKey: "title",
      id: "username",
      header: ({ column }) => (
        <DataGridColumnHeader
          title="Username"
          visibility={true}
          column={column}
        />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.title}</span>
      ),
      size: 140,
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      meta: {
        headerTitle: "Username",
        skeleton: <Skeleton className="h-4 w-24" />,
      },
    },
    {
      accessorKey: "clientId",
      id: "clientId",
      header: ({ column }) => (
        <DataGridColumnHeader
          title="Client ID"
          visibility={true}
          column={column}
        />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.clientId || "—"}</span>
      ),
      size: 110,
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      meta: {
        headerTitle: "Client ID",
        skeleton: <Skeleton className="h-4 w-16" />,
      },
    },
    {
      accessorKey: "saccoId",
      id: "sacco",
      header: ({ column }) => (
        <DataGridColumnHeader
          title="SACCO"
          visibility={true}
          column={column}
        />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.saccoId || "—"}</span>
      ),
      size: 140,
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      meta: {
        headerTitle: "SACCO",
        skeleton: <Skeleton className="h-4 w-24" />,
      },
    },
    {
      accessorKey: "role",
      id: "role",
      header: ({ column }) => (
        <DataGridColumnHeader title="Role" visibility={true} column={column} />
      ),
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
      size: 120,
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      meta: {
        headerTitle: "Role",
        skeleton: <Skeleton className="h-6 w-16 rounded-full" />,
      },
    },
    {
      accessorKey: "teams",
      id: "teams",
      header: ({ column }) => (
        <DataGridColumnHeader title="Teams" visibility={true} column={column} />
      ),
      cell: ({ row }) => <TeamTags teams={row.original.teams} />,
      size: 200,
      enableSorting: false,
      enableHiding: true,
      enableResizing: true,
      meta: {
        headerTitle: "Teams",
        skeleton: (
          <div className="flex flex-wrap items-center gap-1">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ),
      },
    },
    {
      accessorKey: "status",
      id: "status",
      header: ({ column }) => (
        <DataGridColumnHeader
          title="Status"
          visibility={true}
          column={column}
        />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      size: 120,
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      meta: {
        headerTitle: "Status",
        skeleton: <Skeleton className="h-6 w-24 rounded-full" />,
      },
    },
    {
      accessorKey: "auth",
      id: "auth",
      header: ({ column }) => (
        <DataGridColumnHeader title="Auth" visibility={true} column={column} />
      ),
      cell: ({ row }) => <AuthCell row={row} />,
      size: 220,
      enableSorting: false,
      enableHiding: true,
      enableResizing: true,
      meta: {
        headerTitle: "Auth",
        skeleton: (
          <div className="flex items-center gap-1">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        ),
      },
    },
    {
      accessorKey: "lastActiveIso",
      id: "lastActive",
      header: ({ column }) => (
        <DataGridColumnHeader
          title="Last Active"
          visibility={true}
          column={column}
        />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.lastActive}
        </span>
      ),
      size: 130,
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      meta: {
        headerTitle: "Last Active",
        skeleton: <Skeleton className="h-4 w-28" />,
      },
    },
    {
      accessorKey: "seatLabel",
      id: "seat",
      header: ({ column }) => (
        <DataGridColumnHeader title="Seat" visibility={true} column={column} />
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="text-foreground truncate text-sm font-medium">
            {row.original.seatLabel}
          </div>
          <div className="text-muted-foreground truncate text-xs">
            {row.original.provisioning}
          </div>
        </div>
      ),
      size: 140,
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      meta: {
        headerTitle: "Seat",
        skeleton: (
          <div className="flex min-w-0 flex-col gap-0.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        ),
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ActionsCell
          row={row}
          onEditRole={onEditRole}
          onView={onView}
          onToggleEnabled={onToggleEnabled}
          onResetPassword={onResetPassword}
          canManage={canManage}
        />
      ),
      size: 60,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      meta: {
        skeleton: <Skeleton className="mx-auto size-7 rounded-md" />,
      },
    },
  ]
}