"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  deleteClientAction,
  setClientEnabledAction,
} from "@/app/admin/clients/actions"
import { toastFormError } from "@/components/admin/form-action-error"
import { PendingSubmitContent } from "@/components/admin/form-submit-button"
import { SettingRow } from "@/components/blocks/solution-users-2/components/setting-row"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import type { AdminClient } from "@/lib/keycloak/oidc-clients"

export function ClientDangerTab({
  client,
  canManage,
}: {
  client: AdminClient
  canManage: boolean
}) {
  const router = useRouter()
  const [removeOpen, setRemoveOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const canDisable = canManage && !client.protected
  const canDelete = canManage && !client.protected && !client.builtIn

  function toggleEnabled() {
    startTransition(async () => {
      const result = await setClientEnabledAction(client.id, !client.enabled)
      if (!result.ok) {
        toastFormError("Could not update client", result.error)
        return
      }
      toast.success(client.enabled ? "Client disabled" : "Client enabled")
      router.refresh()
    })
  }

  function removeClient() {
    startTransition(async () => {
      const result = await deleteClientAction(client.id)
      if (!result.ok) {
        toastFormError("Could not delete client", result.error)
        return
      }
      toast.success("Client deleted")
      setRemoveOpen(false)
      router.push("/admin/clients")
    })
  }

  return (
    <Frame spacing="sm" className="text-foreground border-destructive/30">
      <FrameHeader>
        <FrameTitle className="text-destructive-foreground capitalize">
          Danger zone
        </FrameTitle>
        <FrameDescription className="dark:text-foreground/70">
          Disable this application or remove it from the realm.
        </FrameDescription>
      </FrameHeader>
      <FramePanel className="p-0">
        <FieldGroup className="gap-0">
          <SettingRow
            title={client.enabled ? "Disable client" : "Enable client"}
            description={
              client.protected
                ? "The admin console and realm-management clients cannot be disabled."
                : client.enabled
                  ? "Members cannot use this client until it is enabled again."
                  : "Restore this client so members can sign in."
            }
            last={!canDelete}
          >
            <Button
              type="button"
              variant="outline"
              disabled={!canDisable || pending}
              aria-busy={pending}
              onClick={toggleEnabled}
            >
              <PendingSubmitContent
                pending={pending}
                pendingLabel={client.enabled ? "Disabling…" : "Enabling…"}
              >
                {client.enabled ? "Disable" : "Enable"}
              </PendingSubmitContent>
            </Button>
          </SettingRow>
          {canDelete ? (
            <SettingRow
              title="Delete client"
              description="Removes the OpenID Connect application. This cannot be undone."
              last
            >
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() => setRemoveOpen(true)}
              >
                Delete
              </Button>
            </SettingRow>
          ) : null}
        </FieldGroup>
      </FramePanel>

      <AlertDialog
        open={removeOpen}
        onOpenChange={(open) => {
          if (!pending) setRemoveOpen(open)
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this client?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes{" "}
              <span className="text-foreground font-medium">
                {client.clientId}
              </span>{" "}
              from this realm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={pending}
              aria-busy={pending}
              onClick={removeClient}
            >
              <PendingSubmitContent pending={pending} pendingLabel="Deleting…">
                Delete client
              </PendingSubmitContent>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Frame>
  )
}
