import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BULK_ROLE_OPTIONS, type MemberRole } from "./data"
import { PencilIcon, SendIcon, PauseCircleIcon } from "lucide-react"

interface BulkActionBarProps {
  selectedCount: number
  roleValue: MemberRole
  onRoleChange: (value: MemberRole) => void
  onChangeRole: () => void
  onResendInvite: () => void
  onDeactivate: () => void
  onClear: () => void
}

export function BulkActionBar({
  selectedCount,
  roleValue,
  onRoleChange,
  onChangeRole,
  onResendInvite,
  onDeactivate,
  onClear,
}: BulkActionBarProps) {
  return (
    <div className="bg-muted/25 flex flex-col gap-3 px-(--frame-panel-header-px) py-(--frame-panel-header-py) lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium">
          {selectedCount} member{selectedCount === 1 ? "" : "s"} selected
        </span>
        <span className="text-muted-foreground text-xs">
          Change role, resend invites, or revoke access in one step.
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={roleValue}
          onValueChange={(value) => {
            if (!value) return
            onRoleChange(value as MemberRole)
          }}
          items={BULK_ROLE_OPTIONS}
        >
          <SelectTrigger size="sm" className="w-[164px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectGroup>
              {BULK_ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onChangeRole}
        >
          <PencilIcon data-icon="inline-start" aria-hidden="true" />
          Change role
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onResendInvite}
        >
          <SendIcon data-icon="inline-start" aria-hidden="true" />
          Resend invite
        </Button>

        <Button type="button" size="sm" onClick={onDeactivate}>
          <PauseCircleIcon data-icon="inline-start" aria-hidden="true" />
          Deactivate
        </Button>

        <Button type="button" size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  )
}