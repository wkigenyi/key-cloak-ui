"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import type { ClientKind } from "@/lib/keycloak/oidc-clients"

const KINDS: { id: ClientKind; label: string }[] = [
  { id: "applications", label: "Applications" },
  { id: "built-in", label: "Built-in" },
  { id: "all", label: "All" },
]

export function ClientDirectoryControls({ kind }: { kind: ClientKind }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setKind(next: ClientKind) {
    const params = new URLSearchParams(searchParams.toString())
    if (next === "applications") params.delete("kind")
    else params.set("kind", next)
    const query = params.toString()
    router.replace(query ? `/admin/clients?${query}` : "/admin/clients")
  }

  return (
    <div className="flex flex-wrap gap-1">
      {KINDS.map((item) => (
        <Button
          key={item.id}
          type="button"
          size="sm"
          variant={kind === item.id ? "default" : "outline"}
          onClick={() => setKind(item.id)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}
