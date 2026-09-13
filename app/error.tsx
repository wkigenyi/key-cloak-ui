"use client"

import { ErrorState } from "@/components/admin/error-state"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorState
      code="500"
      title="Something went wrong"
      description="The console hit an unexpected error. Try again, or go back to Users."
      digest={error.digest}
      onRetry={reset}
    />
  )
}
