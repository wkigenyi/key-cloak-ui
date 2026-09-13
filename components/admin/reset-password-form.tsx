"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { resetUserPasswordAction } from "@/app/admin/users/actions"
import { toastFormError } from "@/components/admin/form-action-error"
import { PendingSubmitContent } from "@/components/admin/form-submit-button"
import { CheckboxField } from "@/components/admin/checkbox-field"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { validatePasswordPair } from "@/lib/keycloak/user-form"

export function ResetPasswordForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const passwordError = validatePasswordPair(password, passwordConfirm)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (passwordError) return
    const form = event.currentTarget
    const formData = new FormData(form)
    startTransition(async () => {
      const result = await resetUserPasswordAction(formData)
      if (!result.ok) {
        toastFormError("Could not reset password", result.error)
        return
      }
      toast.success("Password reset")
      form.reset()
      setPassword("")
      setPasswordConfirm("")
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t px-4 py-4">
      <div>
        <p className="text-sm font-medium">Reset password</p>
        <p className="text-muted-foreground text-xs">
          Leave Temporary off so the member can sign in from Self Help. A
          temporary password blocks tokens until it is changed in Keycloak.
        </p>
      </div>
      <input type="hidden" name="id" value={userId} />
      <Field data-invalid={password && passwordError ? true : undefined}>
        <FieldLabel htmlFor="reset-password">New password</FieldLabel>
        <Input
          id="reset-password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          aria-invalid={password && passwordError ? true : undefined}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>
      <Field data-invalid={passwordConfirm && passwordError ? true : undefined}>
        <FieldLabel htmlFor="reset-password-confirm">Confirm password</FieldLabel>
        <Input
          id="reset-password-confirm"
          name="passwordConfirm"
          type="password"
          required
          autoComplete="new-password"
          value={passwordConfirm}
          aria-invalid={passwordConfirm && passwordError ? true : undefined}
          onChange={(event) => setPasswordConfirm(event.target.value)}
        />
        {passwordConfirm && passwordError ? (
          <FieldError>{passwordError}</FieldError>
        ) : null}
      </Field>
      <CheckboxField
        id="temporaryPassword"
        name="temporaryPassword"
        label="Temporary"
      />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={pending || Boolean(passwordError)}
        aria-busy={pending}
      >
        <PendingSubmitContent pending={pending} pendingLabel="Resetting…">
          Reset password
        </PendingSubmitContent>
      </Button>
    </form>
  )
}
