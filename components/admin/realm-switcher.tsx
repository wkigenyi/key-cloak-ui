"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { switchWorkspaceAction } from "@/app/admin/workspace-actions"
import { toastFormError } from "@/components/admin/form-action-error"
import { useWorkspaceSwitch } from "@/components/admin/workspace-switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

export function RealmSwitcher({
  realm,
  realms,
}: {
  realm: string
  realms: string[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const { switchingTo, beginSwitch, dismissWorkspaceSwitch } =
    useWorkspaceSwitch()
  const options = realms.includes(realm) ? realms : [realm, ...realms]
  const selected = switchingTo ?? realm
  const busy = pending || Boolean(switchingTo)

  return (
    <Select
      value={selected}
      disabled={busy || options.length === 0}
      onValueChange={(next) => {
        if (!next || next === realm) return
        beginSwitch(next)
        startTransition(async () => {
          const result = await switchWorkspaceAction(next)
          if (!result.ok) {
            dismissWorkspaceSwitch()
            toastFormError("Could not switch SACCO", result.error)
            return
          }
          router.push("/admin/users")
          router.refresh()
        })
      }}
    >
      <SelectTrigger
        size="sm"
        className="h-8 w-full min-w-0"
        aria-label="Selected realm"
        aria-busy={busy}
      >
        {busy && switchingTo ? (
          <span className="flex min-w-0 flex-1 items-center gap-1.5">
            <Spinner className="size-3.5" data-icon="inline-start" />
            <span className="truncate">
              Loading Self Help users in {switchingTo}…
            </span>
          </span>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent>
        {options.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
