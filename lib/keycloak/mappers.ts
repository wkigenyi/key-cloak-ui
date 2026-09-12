import type { AdminUser } from "@/lib/keycloak/admin"
import type { IMember } from "@/components/blocks/solution-users-1/components/data"

export function toMember(user: AdminUser): IMember {
  const name =
    user.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username

  return {
    id: user.id,
    name,
    avatar: "",
    email: user.email || "",
    role: user.kind === "operator" ? "Admin" : "Member",
    title: user.username,
    scope: "None",
    teams: [],
    status: user.enabled ? "Active" : "Deactivated",
    auth: "Password",
    ssoProvider: null,
    twoFactor: null,
    provisioning: "Manual",
    lastActive: user.lastLogin
      ? new Date(user.lastLogin).toLocaleString()
      : "—",
    lastActiveIso: user.lastLogin || "",
    seatLabel: user.username,
    clientId: user.clientId,
    saccoId: user.saccoId,
    phone: user.phone,
    username: user.username,
    kind: user.kind,
  }
}
