"use client"

import { Fragment } from "react"
import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { ResetPasswordForm } from "@/components/admin/reset-password-form"
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
  credentials,
  canManage,
}: {
  userId: string
  email: string
  emailVerified: boolean
  credentials: UserCredentialInfo[]
  canManage: boolean
}) {
  const password = credentials.find((item) => item.type === "password")
  const otp = credentials.filter((item) => item.type === "otp")

  return (
    <div className="space-y-4">
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
        ]}
      />
    </div>
  )
}
