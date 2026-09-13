import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"

export function CheckboxField({
  id,
  name,
  label,
  defaultChecked,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string
  name: string
  label: string
  defaultChecked?: boolean
  checked?: boolean
  disabled?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  const isControlled = checked !== undefined
  const submitted = isControlled ? checked : Boolean(defaultChecked)
  return (
    <Field orientation="horizontal">
      <Checkbox
        id={id}
        name={isControlled ? undefined : name}
        value="on"
        checked={isControlled ? checked : undefined}
        defaultChecked={isControlled ? undefined : defaultChecked}
        disabled={disabled}
        onCheckedChange={
          onCheckedChange
            ? (value) => onCheckedChange(value === true)
            : undefined
        }
      />
      <FieldLabel htmlFor={id} className="font-normal">
        {label}
      </FieldLabel>
      {isControlled ? (
        checked ? <input type="hidden" name={name} value="on" /> : null
      ) : disabled && submitted ? (
        <input type="hidden" name={name} value="on" />
      ) : null}
    </Field>
  )
}
