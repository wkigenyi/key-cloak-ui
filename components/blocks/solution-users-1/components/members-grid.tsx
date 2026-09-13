"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  DataGrid,
  dataGridFeatures,
} from "@/components/reui/data-grid/data-grid"
import { DataGridColumnVisibility } from "@/components/reui/data-grid/data-grid-column-visibility"
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination"
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table"
import { Filters } from "@/components/reui/filters/filters"
import {
  createFilterQuery,
  createFilterRule,
  flattenFilterConditions,
} from "@/components/reui/filters/filters-query"
import type { FilterCondition } from "@/components/reui/filters/filters-query"
import type {
  FilterField,
  FilterQuery,
} from "@/components/reui/filters/filters-types"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import {
  PaginationState,
  RowSelectionState,
  SortingState,
  useTable,
  type ColumnVisibilityState,
} from "@tanstack/react-table"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { TooltipProvider } from "@/components/ui/tooltip"
import { BulkActionBar } from "./bulk-action-bar"
import { createMemberColumns, StatusBadge } from "./columns"
import {
  STATUS_ORDER,
  type IMember,
  type MemberRole,
  type MemberStatus,
  type TeamLabel,
} from "./data"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  resetUserPasswordAction,
  setUserEnabledAction,
} from "@/app/admin/users/actions"
import { UserIcon, MailIcon, AtSignIcon, CircleDotIcon, UserPlusIcon, FilterIcon, FunnelXIcon, Settings2Icon, UploadIcon } from "lucide-react"

// ── Helpers ──

function getActiveFilters(filters: FilterCondition[]) {
  return filters.filter((filter) => {
    const { operator, values } = filter
    // `empty` and `not_empty` take no value, so an empty `values` is the whole
    // condition rather than a half-filled one.
    if (operator === "empty" || operator === "not_empty") return true
    if (!values || values.length === 0) return false
    if (
      values.every((value) => typeof value === "string" && value.trim() === "")
    )
      return false
    if (values.every((value) => value === null || value === undefined))
      return false
    if (values.every((value) => Array.isArray(value) && value.length === 0))
      return false
    return true
  })
}

// `negated` is part of the key: negating a rule keeps the same field, operator
// and values, so leaving it out makes the chip's Negate action a no-op for the
// data even though the chip reads "not starts with".
function serializeActiveFiltersKey(active: FilterCondition[]) {
  return JSON.stringify(
    active.map((f) => ({
      field: f.field,
      operator: f.operator,
      values: f.values,
      negated: f.negated,
    }))
  )
}

function filterFieldValue(item: IMember, field: string): unknown {
  if (field === "teams") return item.teams.join(" ")
  if (field === "username") return item.username || item.title
  return item[field as keyof IMember]
}

// Teams is a list per member, so every operator matches against the whole
// list rather than against one cell value.
function matchesTeamsCondition(
  teams: TeamLabel[],
  operator: string,
  values: unknown[]
): boolean {
  const selected = values.map(String)
  switch (operator) {
    case "is":
      return selected.length > 0 && teams.includes(selected[0] as TeamLabel)
    case "is_not":
      return !selected.some((v) => teams.includes(v as TeamLabel))
    case "is_any_of":
      return selected.some((v) => teams.includes(v as TeamLabel))
    case "is_none_of":
      return !selected.some((v) => teams.includes(v as TeamLabel))
    case "contains": {
      const tokens = selected.map((v) => v.trim()).filter(Boolean)
      if (tokens.length === 0) return true
      return tokens.some((token) =>
        teams.some((t) => t.toLowerCase().includes(token.toLowerCase()))
      )
    }
    case "not_contains":
      return !selected.some((v) =>
        teams.some((t) => t.toLowerCase().includes(v.toLowerCase()))
      )
    case "empty":
      return teams.length === 0
    case "not_empty":
      return teams.length > 0
    default:
      return true
  }
}

function matchesMemberCondition(
  item: IMember,
  field: string,
  operator: string,
  values: unknown[]
): boolean {
  const raw = filterFieldValue(item, field)
  const fieldValue = raw != null ? raw : ""

  switch (operator) {
    case "is":
      return values.includes(fieldValue)
    case "is_not":
      return !values.includes(fieldValue)
    case "is_any_of":
      return values.some((v) => fieldValue === v)
    case "is_none_of":
      return !values.some((v) => fieldValue === v)
    case "contains": {
      const tokens = values.map((v) => String(v).trim()).filter(Boolean)
      if (tokens.length === 0) return true
      return tokens.some((token) =>
        String(fieldValue).toLowerCase().includes(token.toLowerCase())
      )
    }
    case "not_contains":
      return !values.some((v) =>
        String(fieldValue).toLowerCase().includes(String(v).toLowerCase())
      )
    case "starts_with":
      return values.some((v) =>
        String(fieldValue).toLowerCase().startsWith(String(v).toLowerCase())
      )
    case "ends_with":
      return values.some((v) =>
        String(fieldValue).toLowerCase().endsWith(String(v).toLowerCase())
      )
    case "empty":
      return fieldValue === "" || fieldValue == null
    case "not_empty":
      return fieldValue !== "" && fieldValue != null
    default:
      return true
  }
}

function applyFiltersToData(
  data: IMember[],
  filters: FilterCondition[]
): IMember[] {
  const active = getActiveFilters(filters)
  let result = [...data]
  active.forEach((filter) => {
    const { field, operator, values, negated } = filter
    result = result.filter((item) => {
      const matches =
        field === "teams"
          ? matchesTeamsCondition(item.teams, operator, values)
          : matchesMemberCondition(item, field, operator, values)
      // Negate swaps to the operator's declared inverse where there is one and
      // otherwise sets this flag, so "starts with" and "ends with" only read
      // right once the match is flipped here.
      return negated ? !matches : matches
    })
  })
  return result
}

const STATUS_OPTIONS: { value: MemberStatus; label: string }[] =
  STATUS_ORDER.map((status) => ({ value: status, label: status }))

function renderSelectedCount(values: unknown[]) {
  if (values.length === 0) return "Select..."
  if (values.length > 1) return `${values.length} selected`
  return null
}

function createDefaultMemberFilters(): FilterQuery {
  return createFilterQuery([
    createFilterRule({
      id: "name-1",
      path: ["name"],
      operator: "contains",
      value: "",
    }),
  ])
}

function DotSeparator() {
  return (
    <span
      className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
      aria-hidden="true"
    />
  )
}

// ── Main ──

export function MembersGrid({
  members,
  total,
  canManage,
  realm,
  onCreate,
  onView,
  onEdit,
}: {
  members: IMember[]
  total: number
  canManage: boolean
  realm: string
  onCreate?: () => void
  onView?: (member: IMember) => void
  onEdit?: (member: IMember) => void
}) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ])
  const router = useRouter()
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>({
      role: false,
      teams: false,
      auth: false,
      lastActive: true,
      seat: false,
    })
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [filterQuery, setFilterQuery] = useState<FilterQuery>(
    createDefaultMemberFilters
  )
  const filters = useMemo(
    () => flattenFilterConditions(filterQuery),
    [filterQuery]
  )
  const [bulkRole, setBulkRole] = useState<MemberRole>("Member")


  const [isLoading, setIsLoading] = useState(false)
  const [filteredData, setFilteredData] = useState<IMember[]>(members)
  const isInitialLoad = useRef(true)
  const lastAppliedActiveKey = useRef<string>(
    serializeActiveFiltersKey(
      getActiveFilters(flattenFilterConditions(createDefaultMemberFilters()))
    )
  )

  const filterFields: FilterField[] = useMemo(
    () => [
      {
        id: "name",
        label: "Member",
        icon: (
          <UserIcon className="size-3.5" aria-hidden />
        ),
        type: "text",
        placeholder: "Search...",
      },
      {
        id: "username",
        label: "Username",
        icon: (
          <AtSignIcon className="size-3.5" aria-hidden />
        ),
        type: "text",
        placeholder: "Phone or email login",
      },
      {
        id: "email",
        label: "Email",
        icon: (
          <MailIcon className="size-3.5" aria-hidden />
        ),
        type: "text",
        placeholder: "Search...",
      },
      {
        id: "clientId",
        label: "Client ID",
        icon: (
          <UserIcon className="size-3.5" aria-hidden />
        ),
        type: "text",
        placeholder: "Fineract client id",
      },
      {
        id: "saccoId",
        label: "SACCO",
        icon: (
          <UserIcon className="size-3.5" aria-hidden />
        ),
        type: "text",
        placeholder: "saccoId",
      },
      {
        id: "status",
        label: "Status",
        icon: (
          <CircleDotIcon className="size-3.5" aria-hidden />
        ),
        type: "select",
        searchable: false,
        options: STATUS_OPTIONS,
        renderValue: ({ values }) => {
          const state = renderSelectedCount(values)
          if (state) return state

          return <StatusBadge status={values[0] as MemberStatus} />
        },
      },
    ],
    []
  )

  const applyFilters = useCallback(
    (newFilters: FilterCondition[]) => {
      return applyFiltersToData(members, newFilters)
    },
    [members],
  )

  const simulateAsyncFiltering = useCallback(
    async (newFilters: FilterCondition[]) => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 400))
      setFilteredData(applyFilters(newFilters))
      setIsLoading(false)
    },
    [applyFilters]
  )

  const handleFiltersChange = useCallback(
    (nextQuery: FilterQuery) => {
      const newFilters = flattenFilterConditions(nextQuery)

      setFilterQuery(nextQuery)
      const newActive = getActiveFilters(newFilters)
      const nextKey = serializeActiveFiltersKey(newActive)
      if (nextKey === lastAppliedActiveKey.current) return
      lastAppliedActiveKey.current = nextKey
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
      setRowSelection({})
      simulateAsyncFiltering(newFilters)
    },
    [simulateAsyncFiltering]
  )

  useEffect(() => {
    if (isInitialLoad.current) {
      setFilteredData(applyFilters(filters))
      isInitialLoad.current = false
    }
  }, [filters, applyFilters])

  useEffect(() => {
    setFilteredData(applyFilters(filters))
  }, [members, applyFilters, filters])

  const handleView = useCallback(
    (member: IMember) => {
      if (onView) {
        onView(member)
        return
      }
      onEdit?.(member)
    },
    [onView, onEdit],
  )

  const handleEdit = useCallback(
    (member: IMember) => {
      onEdit?.(member)
    },
    [onEdit],
  )

  const handleToggleEnabled = useCallback(async (member: IMember) => {
    const enabled = member.status !== "Active"
    await setUserEnabledAction(member.id, enabled)
    toast.success(enabled ? "User enabled" : "User disabled", {
      description: `${member.name} (${member.title})`,
    })
    router.refresh()
  }, [router])

  const handleResetPassword = useCallback(
    async (member: IMember, password: string, temporary: boolean) => {
      const formData = new FormData()
      formData.set("id", member.id)
      formData.set("password", password)
      formData.set("passwordConfirm", password)
      if (temporary) formData.set("temporaryPassword", "on")
      await resetUserPasswordAction(formData)
      toast.success("Password reset", {
        description: temporary
          ? `${member.name} must change this password on next sign-in.`
          : `Password updated for ${member.name}.`,
      })
    },
    [],
  )

  const columns = useMemo(
    () =>
      createMemberColumns({
        onEditRole: handleEdit,
        onView: handleView,
        onToggleEnabled: handleToggleEnabled,
        onResetPassword: handleResetPassword,
        canManage,
      }),
    [
      handleEdit,
      handleView,
      handleToggleEnabled,
      handleResetPassword,
      canManage,
    ],
  )

  const [columnOrder, setColumnOrder] = useState<string[]>(
    columns.map((c) => c.id as string)
  )

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: filteredData,
    pageCount: Math.ceil(filteredData.length / pagination.pageSize),
    getRowId: (row) => row.id,
    state: {
      pagination,
      sorting,
      columnOrder,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: true,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
  })

  const selectedCount = table.getSelectedRowModel().rows.length

  const handleClearSelection = useCallback(() => setRowSelection({}), [])

  const handleChangeRole = useCallback(() => {
    if (selectedCount === 0) return
    setRowSelection({})
    toast.success("Role updated", {
      description: `${selectedCount} member${selectedCount === 1 ? "" : "s"} moved to ${bulkRole}.`,
    })
  }, [bulkRole, selectedCount])

  const handleBulkResend = useCallback(() => {
    if (selectedCount === 0) return
    setRowSelection({})
    toast.info("Invites resent", {
      description: `${selectedCount} link${selectedCount === 1 ? "" : "s"} sent. Each expires in 7 days.`,
    })
  }, [selectedCount])

  const handleBulkDeactivate = useCallback(() => {
    if (selectedCount === 0) return
    setRowSelection({})
    toast.message("Members deactivated", {
      description: `${selectedCount} member${selectedCount === 1 ? "" : "s"} can no longer sign in.`,
    })
  }, [selectedCount])

  const showClearButton = filters.length > 0

  return (
    <TooltipProvider delay={200}>
      {/* Table */}
      <DataGrid
        table={table}
        isLoading={isLoading}
        loadingMode="skeleton"
        recordCount={filteredData.length}
        emptyMessage={
          !isLoading && filteredData.length === 0
            ? "No users match your filters. Clear filters or adjust operators."
            : undefined
        }
        tableLayout={{
          columnsResizable: true,
          columnsMovable: true,
          columnsVisibility: true,
          headerSticky: true,
          dense: true,
        }}
      >
        <Frame spacing="sm" className="w-full min-w-0 overflow-hidden">
          <FrameHeader className="flex-row items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <FrameTitle id="page-heading" className="text-balance">
                Self Help Users
              </FrameTitle>
              <FrameDescription className="flex items-center gap-1.5 text-xs text-pretty">
                <span>
                  {total} record{total === 1 ? "" : "s"} in {realm}
                </span>
                <DotSeparator />
                <span>
                  {members.filter((m) => m.status === "Active").length} enabled
                </span>
              </FrameDescription>
            </div>
            {canManage ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="default"
                  nativeButton={false}
                  render={<Link href="/admin/import" />}
                >
                  <UploadIcon aria-hidden="true" />
                  Import
                </Button>
                {onCreate ? (
                  <Button type="button" size="default" onClick={onCreate}>
                    <UserPlusIcon aria-hidden="true" />
                    Create self-help user
                  </Button>
                ) : null}
              </div>
            ) : null}
          </FrameHeader>
          <FramePanel className="min-w-0 overflow-hidden p-0 shadow-none">
            <div className="flex flex-wrap items-center justify-between gap-2 px-(--frame-panel-header-px) py-2.5">
              <Filters
                query={filterQuery}
                fields={filterFields}
                onQueryChange={handleFiltersChange}
                size="default"
                trigger={
                  <Button
                    type="button"
                    size="default"
                    variant="outline"
                    aria-label="Filters"
                  >
                    <FilterIcon aria-hidden />
                    Filters
                  </Button>
                }
              />
              <div className="flex flex-wrap items-center gap-2">
                {showClearButton && (
                  <Button
                    type="button"
                    size="default"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      const nextQuery = createDefaultMemberFilters()
                      const next = flattenFilterConditions(nextQuery)
                      lastAppliedActiveKey.current = serializeActiveFiltersKey(
                        getActiveFilters(next)
                      )
                      setFilterQuery(nextQuery)
                      setRowSelection({})
                      simulateAsyncFiltering(next)
                    }}
                    disabled={isLoading}
                  >
                    <FunnelXIcon aria-hidden />
                    Clear
                  </Button>
                )}
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
              </div>
            </div>
            <Separator />
            {selectedCount > 0 ? (
              <>
                <BulkActionBar
                  selectedCount={selectedCount}
                  roleValue={bulkRole}
                  onRoleChange={setBulkRole}
                  onChangeRole={handleChangeRole}
                  onResendInvite={handleBulkResend}
                  onDeactivate={handleBulkDeactivate}
                  onClear={handleClearSelection}
                />
                <Separator />
              </>
            ) : null}
            <DataGridScrollArea>
              <DataGridTable />
            </DataGridScrollArea>
            <Separator />
            <FrameFooter>
              <DataGridPagination sizes={[10, 20, 30]} />
            </FrameFooter>
          </FramePanel>
        </Frame>
      </DataGrid>
    </TooltipProvider>
  )
}

export { MembersGrid as DataGridView }