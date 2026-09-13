import type { Metadata } from "next"
import { ErrorState } from "@/components/admin/error-state"

export const metadata: Metadata = {
  title: "Not found",
}

export default function AdminNotFound() {
  return (
    <ErrorState
      code="404"
      title="We could not find that in this SACCO"
      description="The user, client, or page is missing in the current realm. It may belong to another SACCO, or the link is out of date."
      fullPage={false}
    />
  )
}
