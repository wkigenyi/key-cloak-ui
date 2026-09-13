"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { ErrorState } from "@/components/admin/error-state"
import "./globals.css"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <ErrorState
            code="500"
            title="The console could not start"
            description="A top-level error stopped the page. Try again. If it keeps happening, sign in again."
            digest={error.digest}
            onRetry={reset}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
