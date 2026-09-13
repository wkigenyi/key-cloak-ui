"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateClientAction } from "@/app/admin/clients/actions"
import { ClientFormFields } from "@/components/admin/client-form"
import { toastFormError } from "@/components/admin/form-action-error"
import { PendingSubmitContent } from "@/components/admin/form-submit-button"
import { MemberSummaryFrame } from "@/components/blocks/solution-users-2/components/member-summary-frames"
import { Button } from "@/components/ui/button"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import type { AdminClient } from "@/lib/keycloak/oidc-clients"

const ACCESS_LABEL = {
  public: "Public",
  confidential: "Confidential",
  "bearer-only": "Bearer only",
} as const

export function ClientSettingsTab({
  client,
  canManage,
}: {
  client: AdminClient
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await updateClientAction(formData)
      if (!result.ok) {
        toastFormError("Could not save client", result.error)
        return
      }
      toast.success("Client saved")
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit}>
        <Frame spacing="sm" className="text-foreground">
          <FrameHeader>
            <FrameTitle className="capitalize">Settings</FrameTitle>
            <FrameDescription className="dark:text-foreground/70">
              {client.builtIn
                ? "Built-in Keycloak client."
                : "OpenID Connect application in this realm."}
            </FrameDescription>
          </FrameHeader>
          <FramePanel className="space-y-4">
            <ClientFormFields
              key={`${client.id}-${client.name}-${client.rootUrl}`}
              client={client}
              readOnly={!canManage}
            />
          </FramePanel>
          {canManage ? (
            <FrameFooter className="flex-row justify-end gap-2">
              <Button type="submit" disabled={pending} aria-busy={pending}>
                <PendingSubmitContent pending={pending} pendingLabel="Saving…">
                  Save changes
                </PendingSubmitContent>
              </Button>
            </FrameFooter>
          ) : null}
        </Frame>
      </form>

      <MemberSummaryFrame
        title="Access"
        description="How this application authenticates members."
        items={[
          {
            id: "client-id",
            label: "OIDC client ID",
            value: client.clientId,
          },
          {
            id: "access",
            label: "Access type",
            value: ACCESS_LABEL[client.accessType],
            badge: {
              label: ACCESS_LABEL[client.accessType],
              variant: client.publicClient ? "info-light" : "secondary",
            },
          },
          {
            id: "flows",
            label: "Flows",
            value:
              [
                client.standardFlowEnabled ? "Standard" : null,
                client.directAccessGrantsEnabled ? "Password" : null,
                client.serviceAccountsEnabled ? "Service account" : null,
              ]
                .filter(Boolean)
                .join(", ") || "None",
          },
          {
            id: "root",
            label: "Root URL",
            value: client.rootUrl || "—",
          },
        ]}
      />
    </div>
  )
}
