"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  DataGrid,
  dataGridFeatures,
  type DataGridFeatures,
} from "@/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import { DataGridColumnVisibility } from "@/components/reui/data-grid/data-grid-column-visibility"
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
import { CheckIcon, Settings2Icon } from "lucide-react"
import {
  reviewImportRows,
  type ImportFileRow,
  type ImportRowProgress,
} from "@/lib/import/user-file"
import {
  PaginationState,
  SortingState,
  useTable,
  type ColumnDef,
  type ColumnPinningState,
  type ColumnVisibilityState,
} from "@tanstack/react-table"

function EmptyCell({ value }: { value?: string }) {
  if (value) {
    return <span className="truncate text-sm">{value}</span>
  }
  return <span className="text-muted-foreground text-sm">—</span>
}

function ProgressTick({
  label,
  done,
  expected = true,
}: {
  label: string
  done?: boolean
  expected?: boolean
}) {
  if (!expected) {
    return (
      <span className="text-muted-foreground text-xs" title={`${label} not expected`}>
        {label}
      </span>
    )
  }
  if (done) {
    return (
      <Badge size="sm" variant="success-light" title={`${label} done`}>
        <CheckIcon aria-hidden="true" />
        {label}
      </Badge>
    )
  }
  return (
    <span className="text-muted-foreground text-xs" title={`${label} pending`}>
      {label}
    </span>
  )
}

function ProgressCell({
  progress,
  hasEmail,
}: {
  progress?: ImportRowProgress
  hasEmail: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <ProgressTick label="Profile" done={progress?.profile} />
      <ProgressTick label="Password" done={progress?.password} />
      <ProgressTick label="Email" done={progress?.email} expected={hasEmail} />
    </div>
  )
}

function ImportStatusCell({
  valid,
  progress,
}: {
  valid: boolean
  progress?: ImportRowProgress
}) {
  if (progress?.status === "importing") {
    return (
      <Badge size="sm" variant="info-light">
        Importing
      </Badge>
    )
  }
  if (progress?.status === "done") {
    return (
      <Badge size="sm" variant="success-light">
        Done
      </Badge>
    )
  }
  if (progress?.status === "failed" || !valid) {
    return (
      <Badge size="sm" variant="destructive-light">
        Skip
      </Badge>
    )
  }
  return (
    <Badge size="sm" variant="secondary">
      Ready
    </Badge>
  )
}

function displayName(firstName?: string, lastName?: string) {
  return [firstName, lastName].filter(Boolean).join(" ")
}

export function ImportReviewGrid({
  rows,
  ready,
  flagged,
  progressByRow,
  activeRowNumber,
  actions,
}: {
  rows: ImportFileRow[]
  ready: number
  flagged: number
  progressByRow?: Record<number, ImportRowProgress>
  activeRowNumber?: number
  actions?: ReactNode
}) {
  const review = useMemo(
    () =>
      reviewImportRows(rows).map((row) => ({
        ...row,
        progress: progressByRow?.[row.rowNumber],
      })),
    [progressByRow, rows],
  )
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: "valid", desc: false },
  ])
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>({
      username: false,
      firstName: false,
      lastName: false,
    })
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    start: [],
    end: ["name"],
  })

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }, [rows])

  useEffect(() => {
    if (!activeRowNumber) return
    const index = review.findIndex((row) => row.rowNumber === activeRowNumber)
    if (index < 0) return
    setPagination((current) => ({
      ...current,
      pageIndex: Math.floor(index / current.pageSize),
    }))
  }, [activeRowNumber, review])

  const columns = useMemo<
    ColumnDef<DataGridFeatures, (typeof review)[number]>[]
  >(
    () => [
      {
        accessorKey: "valid",
        id: "valid",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Import"
            visibility={true}
            column={column}
          />
        ),
        cell: ({ row }) => (
          <ImportStatusCell
            valid={row.original.valid}
            progress={row.original.progress}
          />
        ),
        enableSorting: true,
        enableHiding: false,
        size: 110,
        meta: { headerTitle: "Import" },
      },
      {
        id: "progress",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Progress"
            visibility={true}
            column={column}
          />
        ),
        cell: ({ row }) => (
          <ProgressCell
            progress={row.original.progress}
            hasEmail={Boolean(row.original.email)}
          />
        ),
        enableSorting: false,
        size: 220,
        meta: { headerTitle: "Progress" },
      },
      {
        accessorKey: "reason",
        id: "reason",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Reason"
            visibility={true}
            column={column}
          />
        ),
        cell: ({ row }) => (
          <EmptyCell
            value={row.original.progress?.reason || row.original.reason}
          />
        ),
        enableSorting: true,
        minSize: 160,
        meta: { headerTitle: "Reason", autoSize: true },
      },
      {
        accessorKey: "phone",
        id: "phone",
        header: ({ column }) => (
          <DataGridColumnHeader title="Phone" visibility={true} column={column} />
        ),
        cell: ({ row }) => <EmptyCell value={row.original.phone} />,
        enableSorting: true,
        minSize: 140,
        meta: { headerTitle: "Phone" },
      },
      {
        accessorKey: "email",
        id: "email",
        header: ({ column }) => (
          <DataGridColumnHeader title="Email" visibility={true} column={column} />
        ),
        cell: ({ row }) => (
          <EmptyCell value={row.original.rawEmail || row.original.email} />
        ),
        enableSorting: true,
        minSize: 180,
        meta: { headerTitle: "Email" },
      },
      {
        accessorKey: "username",
        id: "username",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Username"
            visibility={true}
            column={column}
          />
        ),
        cell: ({ row }) => <EmptyCell value={row.original.username} />,
        enableSorting: true,
        minSize: 140,
        meta: { headerTitle: "Username" },
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
        cell: ({ row }) => <EmptyCell value={row.original.clientId} />,
        enableSorting: true,
        size: 90,
        minSize: 72,
        maxSize: 140,
        meta: { headerTitle: "Client ID" },
      },
      {
        accessorKey: "externalId",
        id: "externalId",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="External ID"
            visibility={true}
            column={column}
          />
        ),
        cell: ({ row }) => <EmptyCell value={row.original.externalId} />,
        enableSorting: true,
        size: 90,
        minSize: 72,
        maxSize: 140,
        meta: { headerTitle: "External ID" },
      },
      {
        id: "name",
        accessorFn: (row) => displayName(row.firstName, row.lastName),
        header: ({ column }) => (
          <DataGridColumnHeader title="Name" visibility={true} column={column} />
        ),
        cell: ({ row }) => (
          <EmptyCell
            value={displayName(row.original.firstName, row.original.lastName)}
          />
        ),
        enableSorting: true,
        enablePinning: true,
        minSize: 160,
        meta: { headerTitle: "Name" },
      },
      {
        accessorKey: "firstName",
        id: "firstName",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="First name"
            visibility={true}
            column={column}
          />
        ),
        cell: ({ row }) => <EmptyCell value={row.original.firstName} />,
        enableSorting: true,
        minSize: 120,
        meta: { headerTitle: "First name" },
      },
      {
        accessorKey: "lastName",
        id: "lastName",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Last name"
            visibility={true}
            column={column}
          />
        ),
        cell: ({ row }) => <EmptyCell value={row.original.lastName} />,
        enableSorting: true,
        minSize: 120,
        meta: { headerTitle: "Last name" },
      },
    ],
    [],
  )

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: review,
    pageCount: Math.max(1, Math.ceil(review.length / pagination.pageSize)),
    getRowId: (row) => String(row.rowNumber),
    state: { pagination, sorting, columnVisibility, columnPinning },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnPinningChange: setColumnPinning,
  })

  return (
    <DataGrid
      table={table}
      recordCount={review.length}
      emptyMessage="No rows were found in that file."
      tableLayout={{
        columnsResizable: true,
        columnsVisibility: true,
        columnsPinnable: true,
        headerSticky: true,
        dense: true,
      }}
    >
      <Frame spacing="sm" className="w-full min-w-0 overflow-hidden">
        <FrameHeader className="flex-row items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <FrameTitle>Review upload</FrameTitle>
            <FrameDescription className="text-xs">
              {ready} ready to import
              {flagged > 0 ? ` · ${flagged} will be skipped` : ""}. Username is
              the cleaned phone, or the email if there is no phone.
            </FrameDescription>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <DataGridColumnVisibility
              table={table}
              trigger={
                <Button
                  type="button"
                  size="default"
                  variant="outline"
                  aria-label="View settings"
                >
                  <Settings2Icon aria-hidden="true" />
                  View settings
                </Button>
              }
            />
            {actions}
          </div>
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
  )
}
