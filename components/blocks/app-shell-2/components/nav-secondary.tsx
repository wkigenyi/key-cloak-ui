import Link from "next/link"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { NAV_SECONDARY, type SecondaryItem } from "./data"

function SecondaryNavItem({ item }: { item: SecondaryItem }) {
  return (
    <SidebarMenuItem>
      {/* Sidebar */}
      <SidebarMenuButton
        size="sm"
        tooltip={item.label}
        disabled={item.disabled}
        render={
          item.disabled ? undefined : <Link href={item.href ?? "#"} />
        }
        className="h-8! in-data-[state=collapsed]:h-8! [&_svg]:size-3.5"
      >
        {item.icon}
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function NavSecondary() {
  return (
    <SidebarGroup>
      {/* Sidebar */}
      <SidebarMenu>
        {NAV_SECONDARY.map((item) => (
          <SecondaryNavItem key={item.id} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}