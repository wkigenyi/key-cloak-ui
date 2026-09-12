import { CheckboxField } from "@/components/admin/checkbox-field"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { AdminUser } from "@/lib/keycloak/admin"

export function userFormFieldsKey(user?: AdminUser) {
  if (!user) return "create"
  return [
    user.id,
    user.username,
    user.email,
    user.firstName,
    user.lastName,
    user.phone,
    user.clientId,
    user.enabled,
  ].join(":")
}

export function UserFormFields({
  user,
  saccoId,
  readOnly,
}: {
  user?: AdminUser
  saccoId: string
  readOnly?: boolean
}) {
  const isEdit = Boolean(user)
  const isOperator = user?.kind === "operator"
  const disabled = readOnly === true

  return (
    <>
      {user ? <input type="hidden" name="id" value={user.id} /> : null}
      <Field>
        <FieldLabel htmlFor="username">Username</FieldLabel>
        <Input
          id="username"
          name="username"
          required={!isOperator}
          defaultValue={user?.username ?? ""}
          disabled={disabled || isOperator}
          autoComplete="off"
          placeholder="Phone or email"
        />
        <FieldDescription>
          {isOperator
            ? "Operator login names cannot be changed."
            : "Keycloak login name. Use a phone, or email if there is no phone."}
        </FieldDescription>
      </Field>
      {!isOperator ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="clientId">Fineract client ID</FieldLabel>
            <Input
              id="clientId"
              name="clientId"
              required={!isEdit}
              defaultValue={user?.clientId ?? ""}
              disabled={disabled}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="saccoId">SACCO ID</FieldLabel>
            <Input
              id="saccoId"
              name="saccoId"
              defaultValue={user?.saccoId || saccoId}
              disabled
              readOnly
            />
          </Field>
        </div>
      ) : null}
      <Field>
        <FieldLabel htmlFor="phone">Phone</FieldLabel>
        <Input
          id="phone"
          name="phone"
          defaultValue={user?.phone ?? ""}
          disabled={disabled}
          autoComplete="off"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={user?.email ?? ""}
          disabled={disabled}
          autoComplete="off"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="firstName">First name</FieldLabel>
          <Input
            id="firstName"
            name="firstName"
            defaultValue={user?.firstName ?? ""}
            disabled={disabled}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="lastName">Last name</FieldLabel>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={user?.lastName ?? ""}
            disabled={disabled}
          />
        </Field>
      </div>
      {!isEdit ? (
        <Field>
          <FieldLabel htmlFor="password">Temporary password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
          />
        </Field>
      ) : null}
      <CheckboxField
        id="enabled"
        name="enabled"
        label="Enabled"
        defaultChecked={user?.enabled ?? true}
        disabled={disabled}
      />
      {!isEdit ? (
        <CheckboxField
          id="temporaryPassword"
          name="temporaryPassword"
          label="Password is temporary"
          defaultChecked
        />
      ) : null}
    </>
  )
}
