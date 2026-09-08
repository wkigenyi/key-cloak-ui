import { CheckboxField } from "@/components/admin/checkbox-field"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function RealmFormFields() {
  return (
    <>
      <Field>
        <FieldLabel htmlFor="realm">SACCO ID</FieldLabel>
        <Input
          id="realm"
          name="realm"
          required
          autoComplete="off"
          placeholder="acme-sacco"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="displayName">Display name</FieldLabel>
        <Input
          id="displayName"
          name="displayName"
          autoComplete="off"
          placeholder="Acme SACCO"
        />
      </Field>
      <CheckboxField
        id="enabled"
        name="enabled"
        label="Enabled"
        defaultChecked
      />
    </>
  )
}
