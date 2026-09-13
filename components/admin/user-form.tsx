"use client"

import { useState } from "react"
import { CheckboxField } from "@/components/admin/checkbox-field"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { AdminUser } from "@/lib/keycloak/admin"
import { isOperatorUsername } from "@/lib/keycloak/self-help"
import {
  validateEmailValue,
  validatePasswordPair,
} from "@/lib/keycloak/user-form"

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
    user.emailVerified,
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
  const [username, setUsername] = useState(user?.username ?? "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [emailVerified, setEmailVerified] = useState(
    Boolean(user?.email && user.emailVerified),
  )

  const hasEmail = Boolean(email.trim())
  const usernameError =
    !isOperator && isOperatorUsername(username.trim())
      ? "That username is reserved for console operators."
      : undefined
  const emailError = validateEmailValue(email)
  const passwordError = !isEdit
    ? validatePasswordPair(password, passwordConfirm)
    : undefined

  return (
    <>
      {user ? <input type="hidden" name="id" value={user.id} /> : null}
      <Field data-invalid={usernameError ? true : undefined}>
        <FieldLabel htmlFor="username">Username</FieldLabel>
        <Input
          id="username"
          name="username"
          required={!isOperator}
          value={isOperator ? (user?.username ?? "") : username}
          disabled={disabled || isOperator}
          autoComplete="off"
          placeholder="Phone or email"
          aria-invalid={usernameError ? true : undefined}
          onChange={(event) => setUsername(event.target.value)}
        />
        <FieldDescription>
          {isOperator
            ? "Operator login names cannot be changed."
            : "Keycloak login name. Use a phone, or email if there is no phone."}
        </FieldDescription>
        {usernameError ? <FieldError>{usernameError}</FieldError> : null}
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
      <Field data-invalid={emailError ? true : undefined}>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          disabled={disabled}
          autoComplete="off"
          aria-invalid={emailError ? true : undefined}
          onChange={(event) => {
            const next = event.target.value
            setEmail(next)
            if (!next.trim()) setEmailVerified(false)
          }}
        />
        {emailError ? <FieldError>{emailError}</FieldError> : null}
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
        <>
          <Field data-invalid={password && passwordError ? true : undefined}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
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
            <FieldLabel htmlFor="passwordConfirm">Confirm password</FieldLabel>
            <Input
              id="passwordConfirm"
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
        </>
      ) : null}
      <CheckboxField
        id="enabled"
        name="enabled"
        label="Enabled"
        defaultChecked={user?.enabled ?? true}
        disabled={disabled}
      />
      <CheckboxField
        id="emailVerified"
        name="emailVerified"
        label="Email verified"
        checked={hasEmail && emailVerified}
        disabled={disabled || !hasEmail}
        onCheckedChange={setEmailVerified}
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
