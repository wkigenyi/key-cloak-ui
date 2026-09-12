"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { createRealmAction } from "@/app/admin/realms/actions"
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
    try {
      await createRealmAction(formData)
      toast.success("SACCO realm created")
      router.push("/admin/users")
      router.refresh()
    } catch (error) {
      toast.error("Could not create realm", {
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
