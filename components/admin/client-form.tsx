import { CheckboxField } from "@/components/admin/checkbox-field"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { AdminClient } from "@/lib/keycloak/oidc-clients"

function lines(values: string[]) {
  return values.join("\n")
}

export function ClientFormFields({
  client,
  readOnly,
}: {
  client?: AdminClient
  readOnly?: boolean
}) {
  const isEdit = Boolean(client)
  const disabled = readOnly === true

  return (
    <>
      {client ? <input type="hidden" name="id" value={client.id} /> : null}
      <Field>
        <FieldLabel htmlFor="clientId">OIDC client ID</FieldLabel>
        <Input
          id="clientId"
          name="clientId"
          required={!isEdit}
          defaultValue={client?.clientId}
          disabled={isEdit || disabled}
          autoComplete="off"
          placeholder="self-help-app"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input
          id="name"
          name="name"
          defaultValue={client?.name}
          disabled={disabled}
          autoComplete="off"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Input
          id="description"
          name="description"
          defaultValue={client?.description}
          disabled={disabled}
          autoComplete="off"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="rootUrl">Root URL</FieldLabel>
        <Input
          id="rootUrl"
          name="rootUrl"
          defaultValue={client?.rootUrl}
          disabled={disabled}
          placeholder="https://mobile.bankayo.io"
          autoComplete="off"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="redirectUris">Redirect URIs</FieldLabel>
        <textarea
          id="redirectUris"
          name="redirectUris"
          defaultValue={client ? lines(client.redirectUris) : ""}
          disabled={disabled}
          rows={3}
          className="border-input bg-transparent dark:bg-input/30 min-h-16 w-full rounded-lg border px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          placeholder={"https://app.example.com/callback\nhttp://localhost:3000/api/auth/callback/keycloak"}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="webOrigins">Web origins</FieldLabel>
        <textarea
          id="webOrigins"
          name="webOrigins"
          defaultValue={client ? lines(client.webOrigins) : ""}
          disabled={disabled}
          rows={2}
          className="border-input bg-transparent dark:bg-input/30 min-h-12 w-full rounded-lg border px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
          placeholder="https://app.example.com"
        />
      </Field>
      <CheckboxField
        id="publicClient"
        name="publicClient"
        label="Public client (no secret; use PKCE)"
        defaultChecked={client?.publicClient ?? false}
        disabled={disabled}
      />
      <CheckboxField
        id="standardFlowEnabled"
        name="standardFlowEnabled"
        label="Standard flow (authorization code)"
        defaultChecked={client?.standardFlowEnabled ?? true}
        disabled={disabled}
      />
      <CheckboxField
        id="directAccessGrantsEnabled"
        name="directAccessGrantsEnabled"
        label="Direct access grants (password)"
        defaultChecked={client?.directAccessGrantsEnabled ?? false}
        disabled={disabled}
      />
      <CheckboxField
        id="serviceAccountsEnabled"
        name="serviceAccountsEnabled"
        label="Service account"
        defaultChecked={client?.serviceAccountsEnabled ?? false}
        disabled={disabled}
      />
      <CheckboxField
        id="enabled"
        name="enabled"
        label="Enabled"
        defaultChecked={client?.enabled ?? true}
        disabled={
          disabled ||
          client?.clientId === "keycloak-ui" ||
          client?.clientId === "realm-management"
        }
      />
    </>
  )
}
