"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { RealmFormSheet } from "@/components/admin/realm-form-sheet"
import { RealmsGrid } from "@/components/admin/realms-grid"
import { withSheetParams } from "@/components/admin/sheet-params"
import type { AdminRealm } from "@/lib/keycloak/realms"

export function RealmsDirectory({
  realms,
  total,
  canManage,
  canCreate,
  workspace,
}: {
  realms: AdminRealm[]
  total: number
  canManage: boolean
  canCreate: boolean
  workspace: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  return (
    <>
      <RealmsGrid
        realms={realms}
        total={total}
        canManage={canManage}
        canCreate={canCreate}
        workspace={workspace}
        onCreate={
          canCreate
            ? () => {
                const query = withSheetParams(searchParams, { create: true })
                router.replace(`/admin/realms?${query}`)
              }
            : undefined
        }
        onSettings={(item) =>
          router.push(`/admin/realms/${encodeURIComponent(item.realm)}`)
        }
      />
      <RealmFormSheet canCreate={canCreate} />
    </>
  )
}
