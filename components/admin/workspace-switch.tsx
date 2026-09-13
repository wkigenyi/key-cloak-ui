"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { DirectoryGridSkeleton } from "@/components/admin/page-skeletons"

type WorkspaceSwitchContextValue = {
  switchingTo: string | null
  beginSwitch: (realm: string) => void
  markWorkspaceReady: (realm: string) => void
  dismissWorkspaceSwitch: () => void
}

const WorkspaceSwitchContext = createContext<WorkspaceSwitchContextValue | null>(
  null,
)

export function useWorkspaceSwitch() {
  const value = useContext(WorkspaceSwitchContext)
  if (!value) {
    throw new Error("useWorkspaceSwitch must be used within WorkspaceSwitchProvider")
  }
  return value
}

export function WorkspaceSwitchProvider({
  children,
}: {
  children: ReactNode
}) {
  const [switchingTo, setSwitchingTo] = useState<string | null>(null)

  const beginSwitch = useCallback((realm: string) => {
    setSwitchingTo(realm)
  }, [])

  const markWorkspaceReady = useCallback((realm: string) => {
    setSwitchingTo((current) => (current === realm ? null : current))
  }, [])

  const dismissWorkspaceSwitch = useCallback(() => {
    setSwitchingTo(null)
  }, [])

  const value = useMemo(
    () => ({
      switchingTo,
      beginSwitch,
      markWorkspaceReady,
      dismissWorkspaceSwitch,
    }),
    [switchingTo, beginSwitch, markWorkspaceReady, dismissWorkspaceSwitch],
  )

  return (
    <WorkspaceSwitchContext.Provider value={value}>
      {children}
    </WorkspaceSwitchContext.Provider>
  )
}

export function AdminMain({ children }: { children: ReactNode }) {
  const { switchingTo } = useWorkspaceSwitch()

  return (
    <div className="relative flex min-w-0 flex-1 flex-col gap-4 py-2 pr-4 pl-2">
      {children}
      {switchingTo ? (
        <div
          className="bg-background absolute inset-0 z-10 py-2 pr-4 pl-2"
          aria-busy="true"
          aria-live="polite"
        >
          <DirectoryGridSkeleton
            title="Self Help Users"
            status={`Loading Self Help users in ${switchingTo}…`}
          />
        </div>
      ) : null}
    </div>
  )
}

export function WorkspaceSwitchReady({ realm }: { realm?: string }) {
  const { markWorkspaceReady, dismissWorkspaceSwitch } = useWorkspaceSwitch()

  useEffect(() => {
    if (realm) {
      markWorkspaceReady(realm)
      return
    }
    dismissWorkspaceSwitch()
  }, [realm, markWorkspaceReady, dismissWorkspaceSwitch])

  return null
}
