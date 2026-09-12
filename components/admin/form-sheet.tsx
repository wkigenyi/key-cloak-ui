"use client"

import { useEffect, useState, useTransition, type ReactNode } from "react"
import { PendingSubmitContent } from "@/components/admin/form-submit-button"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { XIcon } from "lucide-react"

const floatingSheetClassName =
  "inset-y-4 right-4 left-auto h-[calc(100svh-2rem)] w-[min(30rem,calc(100vw-2rem))] max-w-none gap-0 overflow-hidden rounded-xl p-0 outline-none"

export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  formId,
  action,
  submitLabel,
  pendingLabel = "Saving…",
  showSubmit = true,
  children,
  extra,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  formId: string
  action: (formData: FormData) => void | Promise<void>
  submitLabel: string
  pendingLabel?: string
  showSubmit?: boolean
  children: ReactNode
  extra?: ReactNode
}) {
  const [dismissed, setDismissed] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (open) setDismissed(false)
  }, [open])

  return (
    <Sheet
      open={open && !dismissed}
      onOpenChange={(next) => {
        if (pending && !next) return
        if (!next) setDismissed(true)
        onOpenChange(next)
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        className={floatingSheetClassName}
      >
        <SheetHeader className="shrink-0 space-y-0 p-0">
          <div className="flex min-h-12 items-start justify-between gap-2 border-b px-4 py-3">
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold">
                {title}
              </SheetTitle>
              <SheetDescription className="mt-0.5 text-xs">
                {description}
              </SheetDescription>
            </div>
            <SheetClose
              disabled={pending}
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close"
                  disabled={pending}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XIcon aria-hidden="true" />
                </Button>
              }
            />
          </div>
        </SheetHeader>
        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <form
              id={formId}
              aria-busy={pending}
              action={(formData) => {
                startTransition(async () => {
                  await action(formData)
                })
              }}
              className="space-y-4 px-4 py-4"
            >
              {children}
            </form>
            {extra}
          </ScrollArea>
        </div>
        <SheetFooter className="bg-background shrink-0 border-t">
          <div className="flex w-full gap-2">
            {showSubmit ? (
              <Button
                type="submit"
                form={formId}
                disabled={pending}
                aria-busy={pending}
                className="min-w-0 flex-1"
              >
                <PendingSubmitContent pending={pending} pendingLabel={pendingLabel}>
                  {submitLabel}
                </PendingSubmitContent>
              </Button>
            ) : null}
            <SheetClose
              disabled={pending}
              render={
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  className="min-w-0 flex-1"
                >
                  {showSubmit ? "Cancel" : "Close"}
                </Button>
              }
            />
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
