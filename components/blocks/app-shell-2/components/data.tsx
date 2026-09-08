import { type ReactNode } from "react"
import {
  UsersIcon,
  KeyRoundIcon,
  GlobeIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from "lucide-react"

export type NavChild = {
  id: string
  label: string
  href?: string
  isActive?: boolean
}

export type NavItem = {
  id: string
  label: string
  icon: ReactNode
  href?: string
  badge?: string | number
  isActive?: boolean
  disabled?: boolean
  children?: NavChild[]
}

export type Workspace = {
  id: string
  name: string
  tier?: string
  imageUrl?: string
  avatarClassName?: string
}

export type SecondaryItem = {
  id: string
  label: string
  icon: ReactNode
  href?: string
  disabled?: boolean
}

export const WORKSPACES: Workspace[] = [
  {
    id: "app",
    name: "app",
    tier: "Realm",
    avatarClassName: "",
  },
]

export const NAV_MAIN: NavItem[] = [
  {
    id: "users",
    label: "Self Help Users",
    href: "/admin/users",
    icon: <UsersIcon aria-hidden="true" />,
  },
  {
    id: "clients",
    label: "Clients",
    href: "/admin/clients",
    icon: <KeyRoundIcon aria-hidden="true" />,
  },
  {
    id: "realms",
    label: "Realms",
    href: "/admin/realms",
    icon: <GlobeIcon aria-hidden="true" />,
  },
  {
    id: "roles",
    label: "Roles",
    href: "/admin/roles",
    disabled: true,
    icon: <ShieldCheckIcon aria-hidden="true" />,
  },
]

export const NAV_SECONDARY: SecondaryItem[] = [
  {
    id: "account",
    label: "Account",
    href: "/account",
    disabled: true,
    icon: <UserCircleIcon aria-hidden="true" />,
  },
]
