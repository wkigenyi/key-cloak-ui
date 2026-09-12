"use client"

import { useCallback, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  DataGrid,
  dataGridFeatures,
  type DataGridFeatures,
} from "@/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination"
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table"
import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import {
  deleteRealmAction,
  setRealmEnabledAction,
} from "@/app/admin/realms/actions"
import { PendingSubmitContent } from "@/components/admin/form-submit-button"
import { Button } from "@/components/ui/button"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  PaginationState,
  SortingState,
  useTable,
  type ColumnDef,
} from "@tanstack/react-table"
import {
  GlobeIcon,
  MoreHorizontalIcon,
  PauseCircleIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react"
import type { AdminRealm } from "@/lib/keycloak/realms"

export function RealmsGrid({
  realms,
  total,
  canManage,
  canCreate,
  workspace,
  onCreate,
  onSettings,
}: {
  realms: AdminRealm[]
  total: number
  canManage: boolean
  canCreate: boolean
  workspace: string
  onCreate?: () => void
  onSettings?: (realm: AdminRealm) => void
}) {
  const router = useRouter()
  const [pendingDelete, setPendingDelete] = useState<AdminRealm | null>(null)
  const [deleting, startDelete] = useTransition()
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: "realm", desc: false },
  ])

  const handleToggleEnabled = useCallback(
    async (item: AdminRealm) => {
      try {
        await setRealmEnabledAction(item.realm, !item.enabled)
        toast.success(item.enabled ? "Realm disabled" : "Realm enabled", {
          description: item.realm,
        })
        router.refresh()
      } catch (error) {
        toast.error("Could not update realm", {
          description: error instanceof Error ? error.message : undefined,
        })
      }
    },
    [router],
  )

  const handleDelete = useCallback(() => {
    if (!pendingDelete) return
    startDelete(async () => {
      try {
        await deleteRealmAction(pendingDelete.realm)
        toast.success("Realm deleted", { description: pendingDelete.realm })
        setPendingDelete(null)
        router.refresh()
      } catch (error) {
        toast.error("Could not delete realm", {
          description: error instanceof Error ? error.message : undefined,
        })
      }
    })
  }, [pendingDelete, router])

  const columns = useMemo<ColumnDef<DataGridFeatures, AdminRealm>[]>(
    () => [
      {
        accessorKey: "realm",
        id: "realm",
        header: ({ column }) => (
          <DataGridColumnHeader title="Realm" visibility={true} column={column} />
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="text-foreground line-clamp-1 font-medium">
              {row.original.displayName}
            </div>
            <div className="text-muted-foreground line-clamp-1 text-xs">
              {row.original.realm}
            </div>
          </div>
        ),
        enableSorting: true,
        enableHiding: false,
        minSize: 180,
        meta: {
          headerTitle: "Realm",
          skeleton: (
            <div className="flex min-w-0 flex-col gap-0.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          ),
        },
      },
      {
        accessorKey: "sslRequired",
        id: "ssl",
        header: ({ column }) => (
          <DataGridColumnHeader title="SSL" visibility={true} column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm capitalize">{row.original.sslRequired}</span>
        ),
        size: 120,
        meta: {
          headerTitle: "SSL",
          skeleton: <Skeleton className="h-4 w-16" />,
        },
      },
      {
        id: "registration",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Registration"
            visibility={true}
            column={column}
          />
        ),
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.registrationAllowed ? "success-outline" : "outline"
            }
          >
            {row.original.registrationAllowed ? "Allowed" : "Off"}
          </Badge>
        ),
        size: 130,
        meta: {
          headerTitle: "Registration",
          skeleton: <Skeleton className="h-6 w-16 rounded-full" />,
        },
      },
      {
        accessorKey: "enabled",
        id: "status",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Status"
            visibility={true}
            column={column}
          />
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.enabled ? "success-outline" : "outline"}>
            {row.original.enabled ? "Enabled" : "Disabled"}
          </Badge>
        ),
        size: 110,
        meta: {
          headerTitle: "Status",
          skeleton: <Skeleton className="h-6 w-16 rounded-full" />,
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const item = row.original
          return (
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
              <DropdownMenuContent side="bottom" align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => onSettings?.(item)}>
                    <SettingsIcon className="size-4" aria-hidden="true" />
                    Open settings
                  </DropdownMenuItem>
                  {canManage && !item.protected ? (
                    <DropdownMenuItem onClick={() => handleToggleEnabled(item)}>
                      <PauseCircleIcon className="size-4" aria-hidden="true" />
                      {item.enabled ? "Disable" : "Enable"}
                    </DropdownMenuItem>
                  ) : null}
                  {canManage && !item.protected ? (
                    <DropdownMenuItem onClick={() => setPendingDelete(item)}>
                      <Trash2Icon className="size-4" aria-hidden="true" />
                      Delete
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        size: 56,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [canManage, handleToggleEnabled, onSettings],
  )

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: realms,
    pageCount: Math.ceil(realms.length / pagination.pageSize),
    getRowId: (row) => row.realm,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
  })

  return (
    <TooltipProvider delay={200}>
      <DataGrid
        table={table}
        recordCount={realms.length}
        emptyMessage="No realms are visible to this account."
        tableLayout={{
          columnsResizable: true,
          headerSticky: true,
          dense: true,
        }}
      >
        <Frame spacing="sm" className="w-full">
          <FrameHeader className="flex-row items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <FrameTitle id="page-heading" className="text-balance">
                Realms
              </FrameTitle>
              <FrameDescription className="text-xs">
                {total} SACCO realm{total === 1 ? "" : "s"} · workspace {workspace}
              </FrameDescription>
            </div>
            {canCreate && onCreate ? (
              <Button type="button" size="default" onClick={onCreate}>
                <GlobeIcon aria-hidden="true" />
                Create SACCO
              </Button>
            ) : null}
          </FrameHeader>
          <FramePanel className="p-0 shadow-none">
            <DataGridScrollArea>
              <DataGridTable />
            </DataGridScrollArea>
          </FramePanel>
          <FrameFooter>
            <DataGridPagination />
          </FrameFooter>
        </Frame>
      </DataGrid>

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete realm</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {pendingDelete?.realm} and every user,
              client, and group inside it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              aria-busy={deleting}
              onClick={(event) => {
                event.preventDefault()
                handleDelete()
              }}
            >
              <PendingSubmitContent pending={deleting} pendingLabel="Deleting…">
                Delete
              </PendingSubmitContent>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
