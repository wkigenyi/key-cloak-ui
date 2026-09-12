"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  createClientAction,
  updateClientAction,
} from "@/app/admin/clients/actions"
import { ClientFormFields } from "@/components/admin/client-form"
import { FormSheet } from "@/components/admin/form-sheet"
import { withSheetParams } from "@/components/admin/sheet-params"
import type { AdminClient } from "@/lib/keycloak/oidc-clients"

export function ClientFormSheet({
  client,
  canManage,
}: {
  client: AdminClient | null
  canManage: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isCreate = searchParams.get("create") === "1"
  const editId = searchParams.get("edit")
  const open = isCreate || Boolean(editId)

  function closeSheet() {
    const query = withSheetParams(searchParams, {})
    router.replace(query ? `/admin/clients?${query}` : "/admin/clients")
  }

  function openEdit(id: string) {
    const query = withSheetParams(searchParams, { edit: id })
    router.replace(`/admin/clients?${query}`)
  }

  async function onCreate(formData: FormData) {
    try {
      const { id } = await createClientAction(formData)
      toast.success("Client created")
      openEdit(id)
      router.refresh()
    } catch (error) {
      toast.error("Could not create client", {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  async function onUpdate(formData: FormData) {
    try {
      await updateClientAction(formData)
      toast.success("Client updated")
      router.refresh()
    } catch (error) {
      toast.error("Could not update client", {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) closeSheet()
      }}
      title={isCreate ? "Create client" : (client?.clientId ?? "Client")}
      description={
        isCreate
          ? "OpenID Connect application in this realm."
          : client?.builtIn
            ? "Built-in Keycloak client."
            : "OpenID Connect application in this realm."
      }
      formId="client-form"
      action={isCreate ? onCreate : onUpdate}
      submitLabel={isCreate ? "Create application" : "Save changes"}
      pendingLabel={isCreate ? "Creating…" : "Saving…"}
      showSubmit={canManage && (isCreate || Boolean(client))}
    >
      <ClientFormFields
        key={isCreate ? "create" : (client?.id ?? "missing")}
        client={isCreate ? undefined : (client ?? undefined)}
        readOnly={!canManage}
      />
    </FormSheet>
  )
}
