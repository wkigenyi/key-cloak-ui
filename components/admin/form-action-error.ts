"use client"

import { toast } from "sonner"

/** Toast a failed submit. Do not throw — the sheet keeps field values. */
export function toastFormError(title: string, error: unknown) {
  toast.error(title, {
    description: typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : undefined,
  })
}
