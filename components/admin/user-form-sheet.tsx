"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  createUserAction,
  updateUserAction,
} from "@/app/admin/users/actions"
import { FormSheet } from "@/components/admin/form-sheet"
import { ResetPasswordForm } from "@/components/admin/reset-password-form"
import { withSheetParams } from "@/components/admin/sheet-params"
import { UserFormFields } from "@/components/admin/user-form"
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
    try {
      const { id } = await createUserAction(formData)
      toast.success("Self-help user created")
      openEdit(id)
      router.refresh()
    } catch (error) {
      toast.error("Could not create user", {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  async function onUpdate(formData: FormData) {
    try {
      await updateUserAction(formData)
      toast.success("User updated")
      router.refresh()
    } catch (error) {
      toast.error("Could not update user", {
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
      showSubmit={canManage && (isCreate || Boolean(user))}
      extra={
        !isCreate && user && canManage ? (
          <ResetPasswordForm userId={user.id} />
        ) : null
      }
    >
      <UserFormFields
        key={isCreate ? "create" : (user?.id ?? "missing")}
        user={isCreate ? undefined : (user ?? undefined)}
        saccoId={saccoId}
        readOnly={!canManage}
      />
    </FormSheet>
  )
}
