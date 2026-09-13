"use client"

import { ErrorState } from "@/components/admin/error-state"

export default function AdminErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorState
      code="500"
      title="This page failed to load"
      description="The current SACCO view hit an unexpected error. Try again, or go back to Users."
      digest={error.digest}
      onRetry={reset}
      fullPage={false}
    />
  )
}
