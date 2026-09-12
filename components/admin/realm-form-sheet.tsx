"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { createRealmAction } from "@/app/admin/realms/actions"
import { toastFormError } from "@/components/admin/form-action-error"
import { FormSheet } from "@/components/admin/form-sheet"
import { RealmFormFields } from "@/components/admin/realm-form"
import { withSheetParams } from "@/components/admin/sheet-params"

export function RealmFormSheet({ canCreate }: { canCreate: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const open = searchParams.get("create") === "1"

  function closeSheet() {
    const query = withSheetParams(searchParams, {})
    router.replace(query ? `/admin/realms?${query}` : "/admin/realms")
  }

  async function onCreate(formData: FormData) {
    const result = await createRealmAction(formData)
    if (!result.ok) {
      toastFormError("Could not create realm", result.error)
      return
    }
    toast.success("SACCO realm created")
    router.push("/admin/users")
    router.refresh()
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) closeSheet()
      }}
      title="Create SACCO"
      description="Creates a realm from the app template: user profile, clients, and login policy. The SACCO ID is the realm name."
      formId="realm-form"
      action={onCreate}
      submitLabel="Create SACCO"
      pendingLabel="Creating…"
      showSubmit={canCreate}
    >
      <RealmFormFields />
    </FormSheet>
  )
}
