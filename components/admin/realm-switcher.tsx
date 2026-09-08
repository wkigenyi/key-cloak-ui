"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { switchWorkspaceAction } from "@/app/admin/workspace-actions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function RealmSwitcher({
  realm,
  realms,
}: {
  realm: string
  realms: string[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const options = realms.includes(realm) ? realms : [realm, ...realms]

  return (
    <Select
      value={realm}
      disabled={pending || options.length === 0}
      onValueChange={(next) => {
        if (!next || next === realm) return
        startTransition(async () => {
          await switchWorkspaceAction(next)
          router.refresh()
        })
      }}
    >
      <SelectTrigger
        size="sm"
        className="h-8 w-full min-w-0"
        aria-label="Selected realm"
      >
        <SelectValue />
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
