"use client"

import { useState } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

export function PasswordInput({
  id,
  name,
  value,
  onChange,
  required,
  autoComplete = "new-password",
  invalid,
  placeholder,
}: {
  id: string
  name: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  autoComplete?: string
  invalid?: boolean
  placeholder?: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <InputGroup className="w-full">
      <InputGroupInput
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required={required}
        autoComplete={autoComplete}
        value={value}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <EyeOffIcon aria-hidden="true" />
          ) : (
            <EyeIcon aria-hidden="true" />
          )}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
