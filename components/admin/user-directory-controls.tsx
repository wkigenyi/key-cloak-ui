"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import type { UserKind } from "@/lib/keycloak/self-help"

const KINDS: { id: UserKind; label: string }[] = [
  { id: "self-help", label: "Self-help" },
  { id: "operators", label: "Operators" },
  { id: "all", label: "All" },
]

export function UserDirectoryControls({ kind }: { kind: UserKind }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function replaceKind(nextKind: UserKind) {
    const params = new URLSearchParams(searchParams.toString())
    if (nextKind === "self-help") params.delete("kind")
    else params.set("kind", nextKind)
    params.delete("saccoId")

    const query = params.toString()
    router.replace(query ? `/admin/users?${query}` : "/admin/users")
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-1">
        {KINDS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={kind === item.id ? "default" : "outline"}
            onClick={() => replaceKind(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
