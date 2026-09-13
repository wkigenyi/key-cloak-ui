"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  createUserAction,
  updateUserAction,
} from "@/app/admin/users/actions"
import { toastFormError } from "@/components/admin/form-action-error"
import { FormSheet } from "@/components/admin/form-sheet"
import { ResetPasswordForm } from "@/components/admin/reset-password-form"
import { withSheetParams } from "@/components/admin/sheet-params"
import { UserFormFields, userFormFieldsKey } from "@/components/admin/user-form"
import type { AdminUser } from "@/lib/keycloak/admin"

export function UserFormSheet({
  user,
  canManage,
  saccoId,
}: {
  user: AdminUser | null
  canManage: boolean
  saccoId: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isCreate = searchParams.get("create") === "1"
  const editId = searchParams.get("edit")
  const open = isCreate || Boolean(editId)

  function closeSheet() {
    const query = withSheetParams(searchParams, {})
    router.replace(query ? `/admin/users?${query}` : "/admin/users")
  }

  function openEdit(id: string) {
    const query = withSheetParams(searchParams, { edit: id })
    router.replace(`/admin/users?${query}`)
  }

  async function onCreate(formData: FormData) {
    const result = await createUserAction(formData)
    if (!result.ok) {
      toastFormError("Could not create user", result.error)
      return
    }
    toast.success("Self-help user created")
    openEdit(result.id)
    router.refresh()
  }

  async function onUpdate(formData: FormData) {
    const result = await updateUserAction(formData)
    if (!result.ok) {
      toastFormError("Could not update user", result.error)
      return
    }
    toast.success("User updated")
    router.refresh()
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) closeSheet()
      }}
      title={
        isCreate
          ? "Create self-help user"
          : (user?.username ?? "User")
      }
      description={
        isCreate
          ? `Customer Platform login in ${saccoId}, linked to a Fineract client.`
          : user?.kind === "operator"
            ? "Keycloak operator account."
            : `Customer Platform login in ${saccoId}, linked to a Fineract client.`
      }
      formId="user-form"
      action={isCreate ? onCreate : onUpdate}
      submitLabel={isCreate ? "Create user" : "Save changes"}
      pendingLabel={isCreate ? "Creating…" : "Saving…"}
      showSubmit={canManage && (isCreate || Boolean(user))}
      extra={
        !isCreate && user && canManage ? (
          <ResetPasswordForm userId={user.id} />
        ) : null
      }
    >
      {isCreate ? (
        <UserFormFields
          key="create"
          saccoId={saccoId}
          readOnly={!canManage}
        />
      ) : user && user.id === editId ? (
        <UserFormFields
          key={userFormFieldsKey(user)}
          user={user}
          saccoId={saccoId}
          readOnly={!canManage}
        />
      ) : (
        <p className="text-muted-foreground text-sm">Loading user…</p>
      )}
    </FormSheet>
  )
}
