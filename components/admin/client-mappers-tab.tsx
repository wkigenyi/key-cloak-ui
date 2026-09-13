"use client"

import { Fragment, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ensureSelfHelpMappersAction } from "@/app/admin/clients/actions"
import { toastFormError } from "@/components/admin/form-action-error"
import { PendingSubmitContent } from "@/components/admin/form-submit-button"
import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import {
  SELF_HELP_CLIENT_ID,
  SELF_HELP_REQUIRED_CLAIMS,
  type AdminClient,
  type ClientMapper,
} from "@/lib/keycloak/oidc-client-types"

export function ClientMappersTab({
  client,
  mappers,
  canManage,
}: {
  client: AdminClient
  mappers: ClientMapper[]
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const claims = new Set(mappers.map((item) => item.claimName || item.name))
  const requiredClaims = new Set<string>(SELF_HELP_REQUIRED_CLAIMS)
  const missing = SELF_HELP_REQUIRED_CLAIMS.filter((claim) => !claims.has(claim))
  const isSelfHelp = client.clientId === SELF_HELP_CLIENT_ID

  function addMappers() {
    startTransition(async () => {
      const result = await ensureSelfHelpMappersAction(client.id)
      if (!result.ok) {
        toastFormError("Could not add mappers", result.error)
        return
      }
      toast.success("Self Help token mappers added")
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {isSelfHelp && missing.length > 0 ? (
        <Frame spacing="sm" className="text-foreground">
          <FrameHeader>
            <FrameTitle className="capitalize">Missing claims</FrameTitle>
            <FrameDescription className="dark:text-foreground/70">
              Self Help needs these attributes on the access token or members
              see “missing a Fineract client mapping.”
            </FrameDescription>
          </FrameHeader>
          <FramePanel className="px-5 py-2">
            <div className="flex flex-col">
              {missing.map((claim, index) => (
                <Fragment key={claim}>
                  {index > 0 ? <Separator /> : null}
                  <Item size="sm" className="px-0">
                    <ItemContent className="min-w-0 gap-1">
                      <ItemTitle>{claim}</ItemTitle>
                      <ItemDescription>
                        User attribute mapped into the token.
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions className="self-center">
                      <Badge variant="warning-light">Missing</Badge>
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
                disabled={pending}
                aria-busy={pending}
                onClick={addMappers}
              >
                <PendingSubmitContent pending={pending} pendingLabel="Adding…">
                  Add Self Help mappers
                </PendingSubmitContent>
              </Button>
            </FrameFooter>
          ) : null}
        </Frame>
      ) : null}

      <Frame spacing="sm" className="text-foreground">
        <FrameHeader>
          <FrameTitle className="capitalize">Protocol mappers</FrameTitle>
          <FrameDescription className="dark:text-foreground/70">
            {mappers.length === 0
              ? "No protocol mappers on this client."
              : `${mappers.length} mapper${mappers.length === 1 ? "" : "s"} on access and ID tokens.`}
          </FrameDescription>
        </FrameHeader>
        <FramePanel className="px-5 py-2">
          {mappers.length > 0 ? (
            <div className="flex flex-col">
              {mappers.map((mapper, index) => (
                <Fragment key={mapper.id || `${mapper.name}-${index}`}>
                  {index > 0 ? <Separator /> : null}
                  <Item size="sm" className="px-0">
                    <ItemContent className="min-w-0 gap-1">
                      <ItemTitle>{mapper.name || "Mapper"}</ItemTitle>
                      <ItemDescription>
                        {mapper.userAttribute
                          ? `${mapper.userAttribute} → ${mapper.claimName || mapper.name}`
                          : mapper.protocolMapper}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions className="self-center">
                      <Badge
                        variant={
                          requiredClaims.has(mapper.claimName)
                            ? "success-light"
                            : "secondary"
                        }
                      >
                        {mapper.claimName || "claim"}
                      </Badge>
                    </ItemActions>
                  </Item>
                </Fragment>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-8 text-center text-sm">
              This client has no protocol mappers yet.
            </p>
          )}
        </FramePanel>
      </Frame>
    </div>
  )
}
