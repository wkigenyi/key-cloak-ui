"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ThemeToggle } from "@/components/admin/theme-toggle"
import { SidebarTrigger } from "@/components/ui/sidebar"

function sectionLabel(pathname: string) {
  if (pathname.startsWith("/admin/realms")) return "Realms"
  if (pathname.startsWith("/admin/clients")) return "Clients"
  if (pathname.startsWith("/admin/import")) return "Import"
  if (pathname.startsWith("/admin/roles")) return "Roles"
  return "Self Help Users"
}

export function AppHeader({ realm }: { realm: string }) {
  const pathname = usePathname()
  const home = pathname.startsWith("/admin/realms")
    ? "/admin/realms"
    : pathname.startsWith("/admin/clients")
      ? "/admin/clients"
      : pathname.startsWith("/admin/import")
        ? "/admin/import"
        : "/admin/users"
  const userDetail = /^\/admin\/users\/[^/]+$/.test(pathname)

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 pt-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex w-full items-center justify-between gap-2 pr-4 pl-2">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="-ml-1 flex opacity-60 hover:opacity-100 md:hidden" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href={home} />}>
                  {realm}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {userDetail ? (
                  <BreadcrumbLink render={<Link href="/admin/users" />}>
                    Self Help Users
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{sectionLabel(pathname)}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {userDetail ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>User</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : null}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
