import type { Metadata } from "next"
import { ErrorState } from "@/components/admin/error-state"

export const metadata: Metadata = {
  title: "Page not found",
}

export default function NotFound() {
  return (
    <ErrorState
      code="404"
      title="This page does not exist"
      description="The address is wrong, or the page was moved. Go back to Users for the current SACCO."
    />
  )
}
