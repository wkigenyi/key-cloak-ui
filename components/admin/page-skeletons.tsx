import { Skeleton } from "@/components/ui/skeleton"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"

function StatusLine({ children }: { children: string }) {
  return <p className="text-muted-foreground text-xs">{children}</p>
}

function KindChips({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-8 w-20 rounded-lg" />
      ))}
    </div>
  )
}

export function DirectoryGridSkeleton({
  title,
  status,
  chips = 3,
}: {
  title: string
  status: string
  chips?: number
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <KindChips count={chips} />
        <StatusLine>{status}</StatusLine>
      </div>
      <Frame spacing="sm" className="w-full min-w-0 overflow-hidden">
        <FrameHeader className="flex-row items-center justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <FrameTitle className="text-balance">{title}</FrameTitle>
            <FrameDescription>
              <Skeleton className="h-3 w-48" />
            </FrameDescription>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-36 rounded-lg" />
          </div>
        </FrameHeader>
        <FramePanel className="min-w-0 overflow-hidden p-0 shadow-none">
          <div className="flex items-center justify-between gap-2 px-(--frame-panel-header-px) py-2.5">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
          <div className="border-border divide-y border-t">
            {Array.from({ length: 8 }, (_, row) => (
              <div key={row} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-40 max-w-full" />
                  <Skeleton className="h-3 w-56 max-w-full" />
                </div>
                <Skeleton className="hidden h-6 w-16 rounded-full sm:block" />
                <Skeleton className="hidden h-6 w-20 rounded-full md:block" />
              </div>
            ))}
          </div>
        </FramePanel>
        <FrameFooter className="flex-row items-center justify-between">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-8 w-36" />
        </FrameFooter>
      </Frame>
    </div>
  )
}

export function DetailPageSkeleton({ status }: { status: string }) {
  return (
    <div className="w-full max-w-4xl space-y-8">
      <header className="flex flex-wrap items-center gap-4 px-1">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <StatusLine>{status}</StatusLine>
        </div>
      </header>
      <div className="flex flex-col gap-5 lg:flex-row lg:gap-8">
        <div className="flex w-full gap-1 lg:w-44 lg:shrink-0 lg:flex-col">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full rounded-lg" />
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SettingsFormSkeleton({ status }: { status: string }) {
  return (
    <div className="w-full max-w-4xl space-y-8">
      <header className="space-y-2 px-1">
        <Skeleton className="h-7 w-56" />
        <StatusLine>{status}</StatusLine>
      </header>
      <div className="flex flex-col gap-5 lg:flex-row lg:gap-8">
        <div className="flex w-full gap-1 lg:w-44 lg:shrink-0 lg:flex-col">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full rounded-lg" />
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-5">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ImportPageSkeleton({ status }: { status: string }) {
  return (
    <Frame spacing="default" className="w-full min-w-0 overflow-hidden">
      <FrameHeader className="flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <FrameTitle>Import self-help users</FrameTitle>
          <StatusLine>{status}</StatusLine>
        </div>
        <Skeleton className="h-8 w-36 rounded-lg" />
      </FrameHeader>
      <FramePanel className="min-w-0 space-y-4">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8">
          <Skeleton className="size-14 rounded-full" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-3 w-72 max-w-full" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </FramePanel>
    </Frame>
  )
}
