import { resetUserPasswordAction } from "@/app/admin/users/actions"
import { CheckboxField } from "@/components/admin/checkbox-field"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function ResetPasswordForm({ userId }: { userId: string }) {
  return (
    <form
      action={resetUserPasswordAction}
      className="space-y-3 border-t px-4 py-4"
    >
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
      <Button type="submit" variant="outline" size="sm">
        Reset password
      </Button>
    </form>
  )
}
