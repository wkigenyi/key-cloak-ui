"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"

export function ThemeModeTabs() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const value = mounted && theme ? theme : "system"

  return (
    <Tabs value={value} onValueChange={setTheme}>
      <TabsList className="w-full">
        <TabsTrigger value="light" className="h-6 flex-1" aria-label="Light">
          <SunIcon className="size-4" aria-hidden="true" />
        </TabsTrigger>
        <TabsTrigger value="dark" className="h-6 flex-1" aria-label="Dark">
          <MoonIcon className="size-4" aria-hidden="true" />
        </TabsTrigger>
        <TabsTrigger value="system" className="h-6 flex-1" aria-label="System">
          <MonitorIcon className="size-4" aria-hidden="true" />
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
