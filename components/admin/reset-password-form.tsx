"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { resetUserPasswordAction } from "@/app/admin/users/actions"
import { toastFormError } from "@/components/admin/form-action-error"
import { PendingSubmitContent } from "@/components/admin/form-submit-button"
import { CheckboxField } from "@/components/admin/checkbox-field"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function ResetPasswordForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    startTransition(async () => {
      try {
        await resetUserPasswordAction(formData)
        toast.success("Password reset")
        form.reset()
        router.refresh()
      } catch (error) {
        toastFormError("Could not reset password", error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t px-4 py-4">
      <div>
        <p className="text-sm font-medium">Reset password</p>
        <p className="text-muted-foreground text-xs">
          Temporary passwords must be changed at next sign-in.
        </p>
      </div>
      <input type="hidden" name="id" value={userId} />
      <Field>
        <FieldLabel htmlFor="reset-password">New password</FieldLabel>
        <Input
          id="reset-password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
        />
      </Field>
      <CheckboxField
        id="temporaryPassword"
        name="temporaryPassword"
        label="Temporary"
        defaultChecked
      />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={pending}
        aria-busy={pending}
      >
        <PendingSubmitContent pending={pending} pendingLabel="Resetting…">
          Reset password
        </PendingSubmitContent>
      </Button>
    </form>
  )
}