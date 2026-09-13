"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { toast } from "sonner"
import { updateUserAction } from "@/app/admin/users/actions"
import { toastFormError } from "@/components/admin/form-action-error"
import { PendingSubmitContent } from "@/components/admin/form-submit-button"
import { UserFormFields, userFormFieldsKey } from "@/components/admin/user-form"
import { Button } from "@/components/ui/button"
import type { AdminUser } from "@/lib/keycloak/admin"
import { MemberSummaryFrame } from "./member-summary-frames"

export function AccessTabContent({
  user,
  saccoId,
  canManage,
}: {
  user: AdminUser
  saccoId: string
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await updateUserAction(formData)
      if (!result.ok) {
        toastFormError("Could not save profile", result.error)
        return
      }
      toast.success("Profile saved")
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit}>
        <Frame spacing="sm" className="text-foreground">
          <FrameHeader>
            <FrameTitle className="capitalize">Profile</FrameTitle>
            <FrameDescription className="dark:text-foreground/70">
              {user.kind === "self-help"
                ? "Self Help login linked to a Fineract client."
                : "Keycloak operator account."}
            </FrameDescription>
          </FrameHeader>
          <FramePanel className="space-y-4">
            <UserFormFields
              key={userFormFieldsKey(user)}
              user={user}
              saccoId={saccoId}
              readOnly={!canManage}
            />
          </FramePanel>
          {canManage ? (
            <FrameFooter className="flex-row justify-end gap-2">
              <Button type="submit" disabled={pending} aria-busy={pending}>
                <PendingSubmitContent pending={pending} pendingLabel="Saving…">
                  Save profile
                </PendingSubmitContent>
              </Button>
            </FrameFooter>
          ) : null}
        </Frame>
      </form>

      <MemberSummaryFrame
        title="Identity"
        description="How this account is recognized in Keycloak."
        items={[
          {
            id: "username",
            label: "Username",
            value: user.username || "—",
            detail: user.kind === "self-help" ? "Phone, or email if there is no phone." : undefined,
          },
          {
            id: "client",
            label: "Fineract client ID",
            value: user.clientId || "—",
            badge: user.clientId
              ? { label: "Linked", variant: "success-light" }
              : { label: "Missing", variant: "warning-light" },
          },
          {
            id: "sacco",
            label: "SACCO",
            value: user.saccoId || saccoId,
          },
          {
            id: "email",
            label: "Email",
            value: user.email || "—",
            badge: user.emailVerified
              ? { label: "Verified", variant: "success-light" }
              : user.email
                ? { label: "Unverified", variant: "warning-light" }
                : undefined,
          },
        ]}
      />
    </div>
  )
}
