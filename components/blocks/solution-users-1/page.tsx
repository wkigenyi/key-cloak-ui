"use client"

import { useEffect, useState } from "react"

import { MembersGrid } from "./components/members-grid"
import { MEMBERS } from "./components/data"

export function Page() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => setIsReady(true), [])

  return (
    <main
      className="mx-auto flex min-h-svh w-full max-w-7xl items-start justify-center p-8 pt-12"
      aria-labelledby="page-heading"
    >
      <h1 id="page-heading" className="sr-only">
        Members directory data grid
      </h1>
      {isReady ? (
        <MembersGrid
          members={MEMBERS}
          total={MEMBERS.length}
          canManage={false}
          realm="app"
        />
      ) : (
        <div className="bg-background min-h-svh w-full" aria-hidden="true" />
      )}
    </main>
  )
}
