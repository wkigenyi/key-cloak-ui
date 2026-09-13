"use client"

import { useCallback, useMemo, useState } from "react"
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
import { Button } from "@/components/ui/button"
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
  EyeIcon,
  KeyRoundIcon,
  MoreHorizontalIcon,
  PauseCircleIcon,
  PencilIcon,
} from "lucide-react"
import { setClientEnabledAction } from "@/app/admin/clients/actions"
import type { AdminClient } from "@/lib/keycloak/oidc-clients"

const ACCESS_LABEL = {
  public: "Public",
  confidential: "Confidential",
  "bearer-only": "Bearer only",
} as const

function accessVariant(type: AdminClient["accessType"]) {
  if (type === "public") return "info-outline" as const
  if (type === "bearer-only") return "warning-outline" as const
  return "secondary" as const
}

export function ClientsGrid({
  clients,
  total,
  canManage,
  realm,
  onCreate,
  onView,
}: {
  clients: AdminClient[]
  total: number
  canManage: boolean
  realm: string
  onCreate?: () => void
  onView?: (client: AdminClient) => void
}) {
  const router = useRouter()
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ])

  const handleView = useCallback(
    (client: AdminClient) => {
      onView?.(client)
    },
    [onView],
  )

  const handleToggleEnabled = useCallback(
    async (client: AdminClient) => {
      const result = await setClientEnabledAction(client.id, !client.enabled)
      if (!result.ok) {
        toast.error("Could not update client", { description: result.error })
        return
      }
      toast.success(client.enabled ? "Client disabled" : "Client enabled", {
        description: client.clientId,
      })
      router.refresh()
    },
    [router],
  )

  const columns = useMemo<ColumnDef<DataGridFeatures, AdminClient>[]>(
    () => [
      {
        accessorKey: "name",
        id: "name",
        header: ({ column }) => (
          <DataGridColumnHeader title="Client" visibility={true} column={column} />
        ),
        cell: ({ row }) => {
          const client = row.original
          return (
            <button
              type="button"
              className="min-w-0 text-left"
              onClick={() => handleView(client)}
            >
              <div className="text-foreground line-clamp-1 font-medium">
                {client.name}
              </div>
              <div className="text-muted-foreground line-clamp-1 text-xs">
                {client.clientId}
              </div>
            </button>
          )
        },
        enableSorting: true,
        enableHiding: false,
        minSize: 200,
        meta: {
          headerTitle: "Client",
          skeleton: (
            <div className="flex min-w-0 flex-col gap-0.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          ),
        },
      },
      {
        accessorKey: "protocol",
        id: "protocol",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Protocol"
            visibility={true}
            column={column}
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm">{row.original.protocol}</span>
        ),
        size: 140,
        meta: {
          headerTitle: "Protocol",
          skeleton: <Skeleton className="h-4 w-24" />,
        },
      },
      {
        accessorKey: "accessType",
        id: "access",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Access"
            visibility={true}
            column={column}
          />
        ),
        cell: ({ row }) => (
          <Badge variant={accessVariant(row.original.accessType)}>
            {ACCESS_LABEL[row.original.accessType]}
          </Badge>
        ),
        size: 140,
        meta: {
          headerTitle: "Access",
          skeleton: <Skeleton className="h-6 w-24 rounded-full" />,
        },
      },
      {
        id: "flow",
        header: ({ column }) => (
          <DataGridColumnHeader title="Flows" visibility={true} column={column} />
        ),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.standardFlowEnabled ? (
              <Badge variant="success-outline">Standard</Badge>
            ) : null}
            {row.original.directAccessGrantsEnabled ? (
              <Badge variant="warning-outline">Password</Badge>
            ) : null}
            {row.original.serviceAccountsEnabled ? (
              <Badge variant="info-outline">Service</Badge>
            ) : null}
            {!row.original.standardFlowEnabled &&
            !row.original.directAccessGrantsEnabled &&
            !row.original.serviceAccountsEnabled ? (
              <span className="text-muted-foreground text-sm">—</span>
            ) : null}
          </div>
        ),
        size: 200,
        enableSorting: false,
        meta: {
          headerTitle: "Flows",
          skeleton: <Skeleton className="h-6 w-20 rounded-full" />,
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
          <Badge
            variant={row.original.enabled ? "success-outline" : "outline"}
          >
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
          const client = row.original
          const canDisable =
            canManage &&
            client.clientId !== "keycloak-ui" &&
            client.clientId !== "realm-management"
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
              <DropdownMenuContent side="bottom" align="end" className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => handleView(client)}>
                    <EyeIcon className="size-4" aria-hidden="true" />
                    View client
                  </DropdownMenuItem>
                  {canManage ? (
                    <DropdownMenuItem onClick={() => handleView(client)}>
                      <PencilIcon className="size-4" aria-hidden="true" />
                      Edit client
                    </DropdownMenuItem>
                  ) : null}
                  {canDisable ? (
                    <DropdownMenuItem
                      onClick={() => handleToggleEnabled(client)}
                    >
                      <PauseCircleIcon className="size-4" aria-hidden="true" />
                      {client.enabled ? "Disable" : "Enable"}
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
    [canManage, handleToggleEnabled, handleView],
  )

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: clients,
    pageCount: Math.ceil(clients.length / pagination.pageSize),
    getRowId: (row) => row.id,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
  })

  return (
    <TooltipProvider delay={200}>
      <DataGrid
        table={table}
        recordCount={clients.length}
        emptyMessage="No clients match this filter."
        tableLayout={{
          columnsResizable: true,
          headerSticky: true,
          dense: true,
        }}
      >
        <Frame spacing="sm" className="w-full min-w-0 overflow-hidden">
          <FrameHeader className="flex-row items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <FrameTitle id="page-heading" className="text-balance">
                Clients
              </FrameTitle>
              <FrameDescription className="text-xs">
                {total} application{total === 1 ? "" : "s"} in {realm}
              </FrameDescription>
            </div>
            {canManage && onCreate ? (
              <Button type="button" size="default" onClick={onCreate}>
                <KeyRoundIcon aria-hidden="true" />
                Create client
              </Button>
            ) : null}
          </FrameHeader>
          <FramePanel className="min-w-0 overflow-hidden p-0 shadow-none">
            <DataGridScrollArea>
              <DataGridTable />
            </DataGridScrollArea>
          </FramePanel>
          <FrameFooter>
            <DataGridPagination />
          </FrameFooter>
        </Frame>
      </DataGrid>
    </TooltipProvider>
  )
}
