"use client"

import { Fragment, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { clearUserRequiredActionsAction } from "@/app/admin/users/actions"
import { toastFormError } from "@/components/admin/form-action-error"
import { PendingSubmitContent } from "@/components/admin/form-submit-button"
import { ResetPasswordForm } from "@/components/admin/reset-password-form"
import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import type { UserCredentialInfo } from "@/lib/keycloak/admin"
import { KeyRoundIcon, MailIcon, ShieldCheckIcon } from "lucide-react"
import { MemberSummaryFrame } from "./member-summary-frames"

const REQUIRED_ACTION_LABELS: Record<string, string> = {
  UPDATE_PASSWORD: "Must change password",
  VERIFY_EMAIL: "Must verify email",
  UPDATE_PROFILE: "Must complete profile",
  CONFIGURE_TOTP: "Must set up OTP",
  TERMS_AND_CONDITIONS: "Must accept terms",
}

function formatWhen(iso: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString()
}

function credentialIcon(type: string) {
  if (type === "otp") return <ShieldCheckIcon aria-hidden="true" />
  if (type === "password") return <KeyRoundIcon aria-hidden="true" />
  return <MailIcon aria-hidden="true" />
}

export function AuthenticationTabContent({
  userId,
  email,
  emailVerified,
  requiredActions = [],
  credentials,
  canManage,
}: {
  userId: string
  email: string
  emailVerified: boolean
  requiredActions?: string[]
  credentials: UserCredentialInfo[]
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const password = credentials.find((item) => item.type === "password")
  const otp = credentials.filter((item) => item.type === "otp")

  function handleClearActions() {
    startTransition(async () => {
      const result = await clearUserRequiredActionsAction(userId)
      if (!result.ok) {
        toastFormError("Could not allow sign-in", result.error)
        return
      }
      toast.success("Required actions cleared")
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {requiredActions.length > 0 ? (
        <Frame spacing="sm" className="text-foreground">
          <FrameHeader>
            <FrameTitle className="capitalize">Account setup</FrameTitle>
            <FrameDescription className="dark:text-foreground/70">
              Keycloak blocks tokens with “Account is not fully set up” until
              these actions are finished.
            </FrameDescription>
          </FrameHeader>
          <FramePanel className="px-5 py-2">
            <div className="flex flex-col">
              {requiredActions.map((action, index) => (
                <Fragment key={action}>
                  {index > 0 ? <Separator /> : null}
                  <Item size="sm" className="px-0">
                    <ItemContent className="min-w-0 gap-1">
                      <ItemTitle>
                        {REQUIRED_ACTION_LABELS[action] ?? action}
                      </ItemTitle>
                      <ItemDescription>{action}</ItemDescription>
                    </ItemContent>
                    <ItemActions className="self-center">
                      <Badge variant="warning-light">Required</Badge>
                    </ItemActions>
                  </Item>
                </Fragment>
              ))}
            </div>
          </FramePanel>
          {canManage ? (
            <FrameFooter className="flex-row justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                aria-busy={pending}
                onClick={handleClearActions}
              >
                <PendingSubmitContent pending={pending} pendingLabel="Clearing…">
                  Allow sign-in
                </PendingSubmitContent>
              </Button>
            </FrameFooter>
          ) : null}
        </Frame>
      ) : null}
      <Frame spacing="sm" className="text-foreground">
        <FrameHeader>
          <FrameTitle className="capitalize">Credentials</FrameTitle>
          <FrameDescription className="dark:text-foreground/70">
            {credentials.length === 0
              ? "No credentials stored."
              : `${credentials.length} credential${credentials.length === 1 ? "" : "s"} on this account.`}
          </FrameDescription>
        </FrameHeader>
        <FramePanel className="px-5 py-2">
          {credentials.length > 0 ? (
            <div className="flex flex-col">
              {credentials.map((item, index) => (
                <Fragment key={item.id || `${item.type}-${index}`}>
                  {index > 0 ? <Separator /> : null}
                  <Item size="sm" className="px-0">
                    <ItemMedia variant="icon">
                      <Item className="border-background bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center border-2 p-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.14)] dark:border [&_svg]:size-4">
                        {credentialIcon(item.type)}
                      </Item>
                    </ItemMedia>
                    <ItemContent className="min-w-0 gap-1">
                      <ItemTitle>{item.label}</ItemTitle>
                      <ItemDescription>
                        {item.createdAt
                          ? `Added ${formatWhen(item.createdAt)}`
                          : item.type}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions className="self-center">
                      <Badge variant="secondary">{item.type}</Badge>
                    </ItemActions>
                  </Item>
                </Fragment>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-8 text-center text-sm">
              This user has no stored credentials yet.
            </p>
          )}
        </FramePanel>
        {canManage ? <ResetPasswordForm userId={userId} /> : null}
      </Frame>

      <MemberSummaryFrame
        title="Sign-in security"
        description="Password and second factor state."
        items={[
          {
            id: "password",
            label: "Password",
            value: password ? "Set" : "Not set",
            badge: password
              ? { label: "Password", variant: "success-light" }
              : { label: "Missing", variant: "warning-light" },
          },
          {
            id: "otp",
            label: "OTP / 2FA",
            value: otp.length ? `${otp.length} factor${otp.length === 1 ? "" : "s"}` : "Not enrolled",
          },
          {
            id: "email",
            label: "Email verification",
            value: email || "No email",
            badge: emailVerified
              ? { label: "Verified", variant: "success-light" }
              : { label: "Unverified", variant: "warning-light" },
          },
          {
            id: "required-actions",
            label: "Required actions",
            value: requiredActions.length
              ? requiredActions
                  .map((action) => REQUIRED_ACTION_LABELS[action] ?? action)
                  .join(", ")
              : "None",
            badge: requiredActions.length
              ? { label: "Blocked", variant: "warning-light" }
              : { label: "Ready", variant: "success-light" },
          },
        ]}
      />
    </div>
  )
}
