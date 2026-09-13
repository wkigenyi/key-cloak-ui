import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { UserPlusIcon, CopyIcon } from "lucide-react"

export function EmptyState() {
  return (
    <div className="flex min-h-svh w-full max-w-3xl items-center justify-center px-4 py-8 md:py-12">
      {/* Empty State */}
      <Empty className="w-full flex-none gap-7 rounded-none border-0 bg-transparent p-0 md:p-0">
        <EmptyHeader className="max-w-120 items-center gap-6 text-center">
          <EmptyMedia className="border-border mb-0 rounded-full border p-4">
            <UserPlusIcon aria-hidden="true" />
          </EmptyMedia>

          <div className="flex flex-col items-center gap-2">
            <EmptyTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Invite the first people in
            </EmptyTitle>
            <EmptyDescription className="max-w-104 text-sm/relaxed">
              Bring owners, editors, and reviewers into the workspace with a
              fast email invite or one secure share link.
            </EmptyDescription>
          </div>
        </EmptyHeader>

        <EmptyContent className="max-w-none items-center gap-0">
          <div className="flex w-full flex-wrap items-center justify-center gap-2">
            <Button type="button">
              <UserPlusIcon data-icon="inline-start" aria-hidden="true" />
              Invite members
            </Button>

            <Button type="button" variant="outline">
              <CopyIcon data-icon="inline-start" aria-hidden="true" />
              Copy invite link
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </div>
  )
}