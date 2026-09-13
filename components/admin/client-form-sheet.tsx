"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { createClientAction } from "@/app/admin/clients/actions"
import { ClientFormFields } from "@/components/admin/client-form"
import { toastFormError } from "@/components/admin/form-action-error"
import { FormSheet } from "@/components/admin/form-sheet"
import { withSheetParams } from "@/components/admin/sheet-params"

export function ClientFormSheet({
  canManage,
}: {
  canManage: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isCreate = searchParams.get("create") === "1"

  function closeSheet() {
    const query = withSheetParams(searchParams, {})
    router.replace(query ? `/admin/clients?${query}` : "/admin/clients")
  }

  async function onCreate(formData: FormData) {
    try {
      const { id } = await createClientAction(formData)
      toast.success("Client created")
      router.push(`/admin/clients/${id}`)
    } catch (error) {
      toastFormError("Could not create client", error)
    }
  }

  return (
    <FormSheet
      open={isCreate}
      onOpenChange={(next) => {
        if (!next) closeSheet()
      }}
      title="Create client"
      description="OpenID Connect application in this realm."
      formId="client-form"
      action={onCreate}
      submitLabel="Create application"
      pendingLabel="Creating…"
      showSubmit={canManage}
    >
      <ClientFormFields key="create" readOnly={!canManage} />
    </FormSheet>
  )
}
