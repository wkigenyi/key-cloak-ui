"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ClientFormSheet } from "@/components/admin/client-form-sheet"
import { ClientsGrid } from "@/components/admin/clients-grid"
import { withSheetParams } from "@/components/admin/sheet-params"
import type { AdminClient } from "@/lib/keycloak/oidc-clients"

export function ClientsDirectory({
  clients,
  total,
  canManage,
  realm,
}: {
  clients: AdminClient[]
  total: number
  canManage: boolean
  realm: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setSheet(next: { create?: boolean }) {
    const query = withSheetParams(searchParams, next)
    router.replace(query ? `/admin/clients?${query}` : "/admin/clients")
  }

  return (
    <>
      <ClientsGrid
        clients={clients}
        total={total}
        canManage={canManage}
        realm={realm}
        onCreate={() => setSheet({ create: true })}
        onView={(item) => router.push(`/admin/clients/${item.id}`)}
      />
      <ClientFormSheet canManage={canManage} />
    </>
  )
}
