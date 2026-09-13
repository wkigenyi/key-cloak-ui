import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { FileQuestionIcon, HouseIcon, RotateCcwIcon, ServerCrashIcon, UsersIcon } from "lucide-react"

export function ErrorState({
  code,
  title,
  description,
  digest,
  onRetry,
  fullPage = true,
}: {
  code: "404" | "500"
  title: string
  description: string
  digest?: string
  onRetry?: () => void
  fullPage?: boolean
}) {
  const Icon = code === "404" ? FileQuestionIcon : ServerCrashIcon

  return (
    <div
      className={
        fullPage
          ? "flex min-h-svh w-full items-center justify-center px-4 py-8 md:py-12"
          : "flex min-h-[50vh] w-full items-center justify-center px-1 py-10"
      }
    >
      <Empty className="w-full max-w-3xl flex-none gap-7 rounded-none border-0 bg-transparent p-0 md:p-0">
        <EmptyHeader className="max-w-120 items-center gap-6 text-center">
          <EmptyMedia className="border-border mb-0 rounded-full border p-4">
            <Icon aria-hidden="true" />
          </EmptyMedia>
          <div className="flex flex-col items-center gap-2">
            <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
              {code === "404" ? "404 · Not found" : "500 · Server error"}
            </p>
            <EmptyTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </EmptyTitle>
            <EmptyDescription className="max-w-104 text-sm/relaxed">
              {description}
            </EmptyDescription>
          </div>
        </EmptyHeader>
        <EmptyContent className="max-w-none items-center gap-3">
          <div className="flex w-full flex-wrap items-center justify-center gap-2">
            {onRetry ? (
              <Button type="button" onClick={onRetry}>
                <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
                Try again
              </Button>
            ) : null}
            <Button
              nativeButton={false}
              render={<Link href="/admin/users" />}
              variant={onRetry ? "outline" : "default"}
            >
              <UsersIcon data-icon="inline-start" aria-hidden="true" />
              Back to Users
            </Button>
            {code === "404" && !onRetry ? (
              <Button
                nativeButton={false}
                render={<Link href="/" />}
                variant="outline"
              >
                <HouseIcon data-icon="inline-start" aria-hidden="true" />
                Home
              </Button>
            ) : null}
          </div>
          {digest ? (
            <p className="text-muted-foreground font-mono text-xs">
              Reference {digest}
            </p>
          ) : null}
        </EmptyContent>
      </Empty>
    </div>
  )
}
