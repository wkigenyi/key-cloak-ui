import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"

export function CheckboxField({
  id,
  name,
  label,
  defaultChecked,
  disabled,
}: {
  id: string
  name: string
  label: string
  defaultChecked?: boolean
  disabled?: boolean
}) {
  return (
    <Field orientation="horizontal">
      <Checkbox
        id={id}
        name={name}
        value="on"
        defaultChecked={defaultChecked}
        disabled={disabled}
      />
      <FieldLabel htmlFor={id} className="font-normal">
        {label}
      </FieldLabel>
      {disabled && defaultChecked ? (
        <input type="hidden" name={name} value="on" />
      ) : null}
    </Field>
  )
}
