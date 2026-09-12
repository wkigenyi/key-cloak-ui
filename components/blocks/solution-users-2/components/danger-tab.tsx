"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { toast } from "sonner"
import {
  deleteUserAction,
  setUserEnabledAction,
} from "@/app/admin/users/actions"
import { toastFormError } from "@/components/admin/form-action-error"
import { PendingSubmitContent } from "@/components/admin/form-submit-button"
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
import type { AdminUser } from "@/lib/keycloak/admin"
import { SettingRow } from "./setting-row"

export function DangerTabContent({
  user,
  canManage,
}: {
  user: AdminUser
  canManage: boolean
}) {
  const router = useRouter()
  const [removeOpen, setRemoveOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const operator = user.kind === "operator"

  function toggleEnabled() {
    startTransition(async () => {
      try {
        await setUserEnabledAction(user.id, !user.enabled)
        toast.success(user.enabled ? "User disabled" : "User enabled")
        router.refresh()
      } catch (error) {
        toastFormError("Could not update user", error)
      }
    })
  }

  function removeUser() {
    startTransition(async () => {
      const result = await deleteUserAction(user.id)
      if (!result.ok) {
        toastFormError("Could not delete user", result.error)
        return
      }
      toast.success("User deleted")
      setRemoveOpen(false)
      router.push("/admin/users")
    })
  }

  return (
    <Frame spacing="sm" className="text-foreground border-destructive/30">
      <FrameHeader>
        <FrameTitle className="text-destructive-foreground capitalize">
          Danger Zone
        </FrameTitle>
        <FrameDescription className="dark:text-foreground/70">
          Disable sign-in or permanently delete this account.
        </FrameDescription>
      </FrameHeader>
      <FramePanel className="p-0">
        <FieldGroup className="gap-0">
          <SettingRow
            title={user.enabled ? "Disable user" : "Enable user"}
            description={
              user.enabled
                ? "Block sign-in. Profile and history stay in this realm."
                : "Restore sign-in for this account."
            }
            last={operator || !canManage}
          >
            <Button
              type="button"
              variant="outline"
              disabled={!canManage || pending}
              aria-busy={pending}
              onClick={toggleEnabled}
            >
              <PendingSubmitContent
                pending={pending}
                pendingLabel={user.enabled ? "Disabling…" : "Enabling…"}
              >
                {user.enabled ? "Disable" : "Enable"}
              </PendingSubmitContent>
            </Button>
          </SettingRow>
          {canManage && !operator ? (
            <SettingRow
              title="Delete user"
              description="Removes the Keycloak account. This cannot be undone."
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
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes{" "}
              <span className="text-foreground font-medium">
                {user.displayName || user.username}
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
              onClick={removeUser}
            >
              <PendingSubmitContent pending={pending} pendingLabel="Deleting…">
                Delete user
              </PendingSubmitContent>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Frame>
  )
}