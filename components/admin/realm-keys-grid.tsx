"use client"

import { useMemo, useState } from "react"
import type { KeyMetadataRepresentation } from "@keycloak/keycloak-admin-client/lib/defs/keyMetadataRepresentation"
import { Badge, type BadgeProps } from "@/components/reui/badge"
import {
  DataGrid,
  dataGridFeatures,
  type DataGridFeatures,
} from "@/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination"
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table"
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
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import {
  useTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table"
import { DownloadIcon, SearchIcon, XIcon } from "lucide-react"

const statusVariant: Record<string, BadgeProps["variant"]> = {
  ACTIVE: "success-light",
  PASSIVE: "warning-light",
  DISABLED: "destructive-light",
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function keySearchBlob(key: KeyMetadataRepresentation) {
  return [key.algorithm, key.type, key.status, key.kid, key.providerId]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

export function RealmKeysGrid({
  realmName,
  keys,
}: {
  realmName: string
  keys: KeyMetadataRepresentation[]
}) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 8,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: "algorithm", desc: false },
  ])
  const [searchQuery, setSearchQuery] = useState("")

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return keys
    return keys.filter((key) => keySearchBlob(key).includes(query))
  }, [keys, searchQuery])

  const columns = useMemo<ColumnDef<DataGridFeatures, KeyMetadataRepresentation>[]>(
    () => [
      {
        accessorKey: "algorithm",
        id: "algorithm",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} visibility={true} />
        ),
        cell: ({ row }) => row.original.algorithm || "—",
        size: 140,
        enableSorting: true,
        meta: { headerTitle: "Algorithm" },
      },
      {
        accessorKey: "type",
        id: "type",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} visibility={true} />
        ),
        cell: ({ row }) => row.original.type || "—",
        size: 100,
        enableSorting: true,
        meta: { headerTitle: "Type" },
      },
      {
        accessorKey: "status",
        id: "status",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} visibility={true} />
        ),
        cell: ({ row }) => (
          <Badge
            variant={statusVariant[row.original.status ?? ""] ?? "outline"}
            size="sm"
          >
            {row.original.status || "—"}
          </Badge>
        ),
        size: 120,
        enableSorting: true,
        meta: { headerTitle: "Status" },
      },
      {
        accessorKey: "kid",
        id: "kid",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} visibility={true} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-xs">
            {row.original.kid || "—"}
          </span>
        ),
        size: 220,
        enableSorting: true,
        meta: { headerTitle: "Kid" },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const key = row.original
          return (
            <div className="flex justify-end gap-1">
              {key.publicKey ? (
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    download(`${realmName}-${key.kid}-public.pem`, key.publicKey!)
                  }
                >
                  <DownloadIcon aria-hidden="true" />
                  Public
                </Button>
              ) : null}
              {key.certificate ? (
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    download(`${realmName}-${key.kid}.crt`, key.certificate!)
                  }
                >
                  <DownloadIcon aria-hidden="true" />
                  Cert
                </Button>
              ) : null}
            </div>
          )
        },
        size: 180,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [realmName],
  )

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: filtered,
    pageCount: Math.max(1, Math.ceil(filtered.length / pagination.pageSize)),
    getRowId: (row) => row.kid ?? row.providerId ?? row.algorithm ?? "key",
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
  })

  return (
    <DataGrid
      table={table}
      recordCount={filtered.length}
      emptyMessage={
        keys.length === 0
          ? "No keys returned for this realm."
          : "No keys match your search."
      }
      tableLayout={{
        columnsPinnable: false,
        columnsResizable: false,
        columnsMovable: false,
        columnsVisibility: false,
        headerSticky: false,
        dense: true,
      }}
    >
      <Frame variant="default" spacing="sm" className="w-full">
        <FrameHeader>
          <FrameTitle className="capitalize">Realm keys</FrameTitle>
          <FrameDescription>Signing and encryption keys for this realm.</FrameDescription>
        </FrameHeader>
        <FramePanel className="bg-card p-0! shadow-none!">
          <div className="px-4 py-3">
            <InputGroup className="w-full sm:w-60">
              <InputGroupAddon align="inline-start">
                <SearchIcon aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search keys..."
                aria-label="Search keys"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  setPagination((current) => ({ ...current, pageIndex: 0 }))
                }}
              />
              {searchQuery.length > 0 ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label="Clear search"
                    size="icon-xs"
                    onClick={() => setSearchQuery("")}
                  >
                    <XIcon aria-hidden="true" />
                  </InputGroupButton>
                </InputGroupAddon>
              ) : null}
            </InputGroup>
          </div>
          <Separator />
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
