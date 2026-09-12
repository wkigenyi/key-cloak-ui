"use client"

import type { ComponentProps, ReactNode } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

type ButtonProps = ComponentProps<typeof Button>

export function PendingSubmitContent({
  pending,
  pendingLabel = "Saving…",
  children,
}: {
  pending: boolean
  pendingLabel?: string
  children: ReactNode
}) {
  if (!pending) return children
  return (
    <>
      <Spinner data-icon="inline-start" />
      {pendingLabel}
    </>
  )
}

export function FormSubmitButton({
  pendingLabel = "Saving…",
  children,
  disabled,
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      {...props}
    >
      <PendingSubmitContent pending={pending} pendingLabel={pendingLabel}>
        {children}
      </PendingSubmitContent>
    </Button>
  )
}
