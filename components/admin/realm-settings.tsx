"use client"

import {
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { toastFormError } from "@/components/admin/form-action-error"
import type RealmRepresentation from "@keycloak/keycloak-admin-client/lib/defs/realmRepresentation"
import type { RealmEventsConfigRepresentation } from "@keycloak/keycloak-admin-client/lib/defs/realmEventsConfigRepresentation"
import type { KeyMetadataRepresentation } from "@keycloak/keycloak-admin-client/lib/defs/keyMetadataRepresentation"
import type { UserProfileConfig } from "@keycloak/keycloak-admin-client/lib/defs/userProfileMetadata"
import type ClientPoliciesRepresentation from "@keycloak/keycloak-admin-client/lib/defs/clientPoliciesRepresentation"
import type ClientProfilesRepresentation from "@keycloak/keycloak-admin-client/lib/defs/clientProfilesRepresentation"
import {
  updateRealmClientPoliciesAction,
  updateRealmEventsAction,
  updateRealmSettingsAction,
  updateRealmUserProfileAction,
} from "@/app/admin/realms/actions"
import { RealmKeysGrid } from "@/components/admin/realm-keys-grid"
import { ProfileSummaryFrame } from "@/components/blocks/profile-1/components/profile-summary-frames"
import { SettingRow } from "@/components/blocks/profile-1/components/setting-row"
import type { SummaryMetric } from "@/components/blocks/profile-1/components/data"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { PendingSubmitContent } from "@/components/admin/form-submit-button"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import {
  ActivityIcon,
  ClockIcon,
  KeyIcon,
  KeyRoundIcon,
  LanguagesIcon,
  LogInIcon,
  MailIcon,
  PaletteIcon,
  ScaleIcon,
  SettingsIcon,
  ShieldCheckIcon,
  ShieldIcon,
  UserIcon,
} from "lucide-react"

const TABS = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "login", label: "Login", icon: LogInIcon },
  { id: "email", label: "Email", icon: MailIcon },
  { id: "themes", label: "Themes", icon: PaletteIcon },
  { id: "sessions", label: "Sessions", icon: ClockIcon },
  { id: "tokens", label: "Tokens", icon: KeyRoundIcon },
  { id: "security", label: "Security", icon: ShieldIcon },
  { id: "localization", label: "Locale", icon: LanguagesIcon },
  { id: "events", label: "Events", icon: ActivityIcon },
  { id: "keys", label: "Keys", icon: KeyIcon },
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "policies", label: "Policies", icon: ScaleIcon },
] as const

type TabId = (typeof TABS)[number]["id"]

function isTab(value: string | null): value is TabId {
  return TABS.some((tab) => tab.id === value)
}

function formData(form: HTMLFormElement) {
  return new FormData(form)
}

function text(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim()
}

function checked(data: FormData, key: string) {
  return data.get(key) === "on"
}

function number(data: FormData, key: string) {
  const raw = text(data, key)
  if (!raw) return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

function lines(data: FormData, key: string) {
  return text(data, key)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function NamedSwitch({
  id,
  name,
  defaultChecked,
  disabled,
}: {
  id: string
  name: string
  defaultChecked?: boolean
  disabled?: boolean
}) {
  const [on, setOn] = useState(Boolean(defaultChecked))
  return (
    <>
      {on ? <input type="hidden" name={name} value="on" /> : null}
      <Switch
        id={id}
        checked={on}
        onCheckedChange={setOn}
        disabled={disabled}
      />
    </>
  )
}

function SettingsSection({
  title,
  description,
  canManage,
  onSubmit,
  children,
}: {
  title: string
  description: string
  canManage: boolean
  onSubmit: (form: HTMLFormElement) => Promise<void>
  children: ReactNode
}) {
  const [dirty, setDirty] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    try {
      await onSubmit(event.currentTarget)
      setDirty(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onInput={() => setDirty(true)}
      onChange={() => setDirty(true)}
    >
      <Frame spacing="sm">
        <FrameHeader>
          <FrameTitle className="capitalize">{title}</FrameTitle>
          <FrameDescription>{description}</FrameDescription>
        </FrameHeader>
        <FramePanel className="p-0!">
          <FieldGroup className="gap-0">{children}</FieldGroup>
        </FramePanel>
        {canManage ? (
          <FrameFooter className="flex-row justify-end gap-2">
            <Button type="submit" disabled={!dirty || pending} aria-busy={pending}>
              <PendingSubmitContent pending={pending} pendingLabel="Saving…">
                Save changes
              </PendingSubmitContent>
            </Button>
          </FrameFooter>
        ) : null}
      </Frame>
    </form>
  )
}

function SidebarRail({
  isMobile,
  activeValue,
}: {
  isMobile: boolean
  activeValue: string
}) {
  return (
    <div className={cn("min-w-0", isMobile ? "w-full" : "w-40 shrink-0")}>
      {isMobile ? (
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="h-auto w-max min-w-max justify-start gap-1 bg-transparent p-0">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "w-full justify-start gap-3 px-3 py-1.5 shadow-none",
                  activeValue === tab.id ? "bg-muted!" : "bg-transparent",
                )}
              >
                <tab.icon aria-hidden="true" />
                <span className="truncate">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      ) : (
        <TabsList className="h-auto w-full flex-col items-stretch gap-1 bg-transparent p-0">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "w-full justify-start gap-3 px-3 py-1.5 shadow-none",
                activeValue === tab.id ? "bg-muted!" : "bg-transparent",
              )}
            >
              <tab.icon aria-hidden="true" />
              <span className="truncate">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      )}
    </div>
  )
}

export function RealmSettings({
  realmName,
  canManage,
  protectedRealm,
  realm,
  events,
  keys,
  userProfile,
  clientPolicies,
  clientProfiles,
}: {
  realmName: string
  canManage: boolean
  protectedRealm: boolean
  realm: RealmRepresentation
  events: RealmEventsConfigRepresentation
  keys: KeyMetadataRepresentation[]
  userProfile: UserProfileConfig
  clientPolicies: ClientPoliciesRepresentation
  clientProfiles: ClientProfilesRepresentation
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const tab = isTab(searchParams.get("tab")) ? searchParams.get("tab")! : "general"
  const disabled = !canManage
  const headers = realm.browserSecurityHeaders ?? {}
  const smtp = realm.smtpServer ?? {}
  const profileJson = useMemo(
    () => JSON.stringify(userProfile, null, 2),
    [userProfile],
  )
  const policiesJson = useMemo(
    () => JSON.stringify(clientPolicies.policies ?? [], null, 2),
    [clientPolicies],
  )
  const profilesJson = useMemo(
    () => JSON.stringify(clientProfiles.profiles ?? [], null, 2),
    [clientProfiles],
  )
  const summary = useMemo<SummaryMetric[]>(
    () => [
      {
        id: "realm",
        label: "Realm ID",
        value: realmName,
        detail: realm.displayName || "No display name",
      },
      {
        id: "status",
        label: "Status",
        value: realm.enabled === false ? "Disabled" : "Enabled",
        badge: {
          label: protectedRealm ? "Protected" : "Workspace",
          variant: protectedRealm ? "warning-light" : "success-light",
        },
      },
      {
        id: "ssl",
        label: "SSL required",
        value: realm.sslRequired ?? "external",
        detail: "Login and token endpoints follow this policy.",
      },
    ],
    [protectedRealm, realm.displayName, realm.enabled, realm.sslRequired, realmName],
  )

  function setTab(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (next === "general") params.delete("tab")
    else params.set("tab", next)
    const query = params.toString()
    router.replace(
      query
        ? `/admin/realms/${encodeURIComponent(realmName)}?${query}`
        : `/admin/realms/${encodeURIComponent(realmName)}`,
    )
  }

  async function saveRealm(patch: Partial<RealmRepresentation>) {
    try {
      await updateRealmSettingsAction(realmName, patch)
      toast.success("Realm settings saved")
      router.refresh()
    } catch (error) {
      toast.error("Could not save settings", {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <div className="w-full max-w-4xl space-y-8">
      <header className="px-1">
        <h1 id="page-heading" className="text-xl font-semibold tracking-tight">
          {realm.displayName || realmName}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          Realm settings for {realmName}
          {protectedRealm ? " · protected" : ""}.
        </p>
      </header>

      <Tabs
        value={tab}
        onValueChange={setTab}
        orientation={isMobile ? "horizontal" : "vertical"}
        className="w-full gap-5 lg:gap-8"
      >
        <SidebarRail isMobile={isMobile} activeValue={tab} />

        <div className="min-w-0 flex-1">
          <TabsContent value="general" className="mt-0 space-y-4">
            {protectedRealm ? (
              <Alert variant="info">
                <ShieldCheckIcon aria-hidden="true" />
                <AlertTitle>Protected realm</AlertTitle>
                <AlertDescription>
                  {realmName} cannot be disabled or deleted.
                </AlertDescription>
              </Alert>
            ) : null}
            <SettingsSection
              title="General"
              description="Identity and availability for this SACCO realm."
              canManage={canManage}
              onSubmit={async (form) => {
                const data = formData(form)
                const frontendUrl = text(data, "frontendUrl")
                const attributes = { ...(realm.attributes ?? {}) }
                if (frontendUrl) attributes.frontendUrl = frontendUrl
                else delete attributes.frontendUrl
                const flag = (key: keyof RealmRepresentation, name: string) => {
                  const next = checked(data, name)
                  const current = realm[key] === true
                  if (!current && !next) return undefined
                  return next
                }
                await saveRealm({
                  displayName: text(data, "displayName") || undefined,
                  displayNameHtml: text(data, "displayNameHtml") || undefined,
                  enabled: protectedRealm ? true : checked(data, "enabled"),
                  sslRequired: text(data, "sslRequired") || "external",
                  userManagedAccessAllowed: flag(
                    "userManagedAccessAllowed",
                    "userManagedAccessAllowed",
                  ),
                  organizationsEnabled: flag(
                    "organizationsEnabled",
                    "organizationsEnabled",
                  ),
                  adminPermissionsEnabled: flag(
                    "adminPermissionsEnabled",
                    "adminPermissionsEnabled",
                  ),
                  verifiableCredentialsEnabled: flag(
                    "verifiableCredentialsEnabled",
                    "verifiableCredentialsEnabled",
                  ),
                  attributes,
                })
              }}
            >
              <SettingRow title="Realm ID" labelFor="realm-id">
                <Input id="realm-id" name="realmId" defaultValue={realmName} disabled />
              </SettingRow>
              <SettingRow title="Display name" labelFor="displayName">
                <Input
                  id="displayName"
                  name="displayName"
                  defaultValue={realm.displayName ?? ""}
                  disabled={disabled}
                  autoComplete="off"
                />
              </SettingRow>
              <SettingRow title="HTML display name" labelFor="displayNameHtml">
                <Input
                  id="displayNameHtml"
                  name="displayNameHtml"
                  defaultValue={realm.displayNameHtml ?? ""}
                  disabled={disabled}
                  autoComplete="off"
                />
              </SettingRow>
              <SettingRow
                title="Frontend URL"
                description="Optional hostname override for this realm."
                labelFor="frontendUrl"
              >
                <Input
                  id="frontendUrl"
                  name="frontendUrl"
                  defaultValue={String(realm.attributes?.frontendUrl ?? "")}
                  disabled={disabled}
                  autoComplete="off"
                />
              </SettingRow>
              <SettingRow title="SSL required" labelFor="sslRequired" compact>
                <select
                  id="sslRequired"
                  name="sslRequired"
                  defaultValue={realm.sslRequired ?? "external"}
                  disabled={disabled}
                  className="border-input bg-transparent dark:bg-input/30 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                >
                  <option value="all">All requests</option>
                  <option value="external">External requests</option>
                  <option value="none">None</option>
                </select>
              </SettingRow>
              <SettingRow
                title="Enabled"
                description="Users can sign in while the realm is enabled."
                labelFor="enabled"
                compact
              >
                <NamedSwitch
                  id="enabled"
                  name="enabled"
                  defaultChecked={realm.enabled !== false}
                  disabled={disabled || protectedRealm}
                />
              </SettingRow>
              <SettingRow title="User-managed access" labelFor="userManagedAccessAllowed" compact>
                <NamedSwitch
                  id="userManagedAccessAllowed"
                  name="userManagedAccessAllowed"
                  defaultChecked={realm.userManagedAccessAllowed === true}
                  disabled={disabled}
                />
              </SettingRow>
              <SettingRow title="Organizations" labelFor="organizationsEnabled" compact>
                <NamedSwitch
                  id="organizationsEnabled"
                  name="organizationsEnabled"
                  defaultChecked={realm.organizationsEnabled === true}
                  disabled={disabled}
                />
              </SettingRow>
              <SettingRow title="Admin permissions" labelFor="adminPermissionsEnabled" compact>
                <NamedSwitch
                  id="adminPermissionsEnabled"
                  name="adminPermissionsEnabled"
                  defaultChecked={realm.adminPermissionsEnabled === true}
                  disabled={disabled}
                />
              </SettingRow>
              <SettingRow
                title="Verifiable credentials"
                labelFor="verifiableCredentialsEnabled"
                compact
                last
              >
                <NamedSwitch
                  id="verifiableCredentialsEnabled"
                  name="verifiableCredentialsEnabled"
                  defaultChecked={realm.verifiableCredentialsEnabled === true}
                  disabled={disabled}
                />
              </SettingRow>
            </SettingsSection>
            <ProfileSummaryFrame
              title="Realm summary"
              description="Identity, status, and TLS policy."
              items={summary}
            />
          </TabsContent>

          <TabsContent value="login" className="mt-0">
            <SettingsSection
              title="Login"
              description="Registration and sign-in options."
              canManage={canManage}
              onSubmit={async (form) => {
                const data = formData(form)
                await saveRealm({
                  registrationAllowed: checked(data, "registrationAllowed"),
                  registrationEmailAsUsername: checked(data, "registrationEmailAsUsername"),
                  resetPasswordAllowed: checked(data, "resetPasswordAllowed"),
                  rememberMe: checked(data, "rememberMe"),
                  loginWithEmailAllowed: checked(data, "loginWithEmailAllowed"),
                  duplicateEmailsAllowed: checked(data, "duplicateEmailsAllowed"),
                  verifyEmail: checked(data, "verifyEmail"),
                  editUsernameAllowed: checked(data, "editUsernameAllowed"),
                })
              }}
            >
              <SettingRow title="User registration" labelFor="registrationAllowed" compact>
                <NamedSwitch id="registrationAllowed" name="registrationAllowed" defaultChecked={realm.registrationAllowed === true} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Email as username" labelFor="registrationEmailAsUsername" compact>
                <NamedSwitch id="registrationEmailAsUsername" name="registrationEmailAsUsername" defaultChecked={realm.registrationEmailAsUsername === true} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Forgot password" labelFor="resetPasswordAllowed" compact>
                <NamedSwitch id="resetPasswordAllowed" name="resetPasswordAllowed" defaultChecked={realm.resetPasswordAllowed === true} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Remember me" labelFor="rememberMe" compact>
                <NamedSwitch id="rememberMe" name="rememberMe" defaultChecked={realm.rememberMe === true} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Login with email" labelFor="loginWithEmailAllowed" compact>
                <NamedSwitch id="loginWithEmailAllowed" name="loginWithEmailAllowed" defaultChecked={realm.loginWithEmailAllowed === true} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Duplicate emails" labelFor="duplicateEmailsAllowed" compact>
                <NamedSwitch id="duplicateEmailsAllowed" name="duplicateEmailsAllowed" defaultChecked={realm.duplicateEmailsAllowed === true} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Verify email" labelFor="verifyEmail" compact>
                <NamedSwitch id="verifyEmail" name="verifyEmail" defaultChecked={realm.verifyEmail === true} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Edit username" labelFor="editUsernameAllowed" compact last>
                <NamedSwitch id="editUsernameAllowed" name="editUsernameAllowed" defaultChecked={realm.editUsernameAllowed === true} disabled={disabled} />
              </SettingRow>
            </SettingsSection>
          </TabsContent>

          <TabsContent value="email" className="mt-0">
            <SettingsSection
              title="Email"
              description="SMTP used for resets and verification."
              canManage={canManage}
              onSubmit={async (form) => {
                const data = formData(form)
                await saveRealm({
                  smtpServer: {
                    from: text(data, "from"),
                    fromDisplayName: text(data, "fromDisplayName"),
                    host: text(data, "host"),
                    port: text(data, "port"),
                    ssl: checked(data, "ssl") ? "true" : "",
                    starttls: checked(data, "starttls") ? "true" : "",
                    auth: checked(data, "auth") ? "true" : "",
                    user: text(data, "user"),
                    password: text(data, "password") || smtp.password,
                  },
                })
              }}
            >
              <SettingRow title="From" labelFor="from">
                <Input id="from" name="from" defaultValue={smtp.from ?? ""} disabled={disabled} autoComplete="off" />
              </SettingRow>
              <SettingRow title="From display name" labelFor="fromDisplayName">
                <Input id="fromDisplayName" name="fromDisplayName" defaultValue={smtp.fromDisplayName ?? ""} disabled={disabled} autoComplete="off" />
              </SettingRow>
              <SettingRow title="Host" labelFor="host">
                <Input id="host" name="host" defaultValue={smtp.host ?? ""} disabled={disabled} autoComplete="off" />
              </SettingRow>
              <SettingRow title="Port" labelFor="port" compact>
                <Input id="port" name="port" defaultValue={smtp.port ?? ""} disabled={disabled} autoComplete="off" />
              </SettingRow>
              <SettingRow title="Username" labelFor="user">
                <Input id="user" name="user" defaultValue={smtp.user ?? ""} disabled={disabled} autoComplete="off" />
              </SettingRow>
              <SettingRow title="Password" labelFor="password">
                <Input id="password" name="password" type="password" disabled={disabled} autoComplete="new-password" />
              </SettingRow>
              <SettingRow title="Enable SSL" labelFor="ssl" compact>
                <NamedSwitch id="ssl" name="ssl" defaultChecked={smtp.ssl === "true"} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Enable StartTLS" labelFor="starttls" compact>
                <NamedSwitch id="starttls" name="starttls" defaultChecked={smtp.starttls === "true"} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Authentication" labelFor="auth" compact last>
                <NamedSwitch id="auth" name="auth" defaultChecked={smtp.auth === "true"} disabled={disabled} />
              </SettingRow>
            </SettingsSection>
          </TabsContent>

          <TabsContent value="themes" className="mt-0">
            <SettingsSection
              title="Themes"
              description="Login, account, admin, and email themes."
              canManage={canManage}
              onSubmit={async (form) => {
                const data = formData(form)
                await saveRealm({
                  loginTheme: text(data, "loginTheme") || undefined,
                  accountTheme: text(data, "accountTheme") || undefined,
                  adminTheme: text(data, "adminTheme") || undefined,
                  emailTheme: text(data, "emailTheme") || undefined,
                })
              }}
            >
              <SettingRow title="Login theme" labelFor="loginTheme">
                <Input id="loginTheme" name="loginTheme" defaultValue={realm.loginTheme ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Account theme" labelFor="accountTheme">
                <Input id="accountTheme" name="accountTheme" defaultValue={realm.accountTheme ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Admin theme" labelFor="adminTheme">
                <Input id="adminTheme" name="adminTheme" defaultValue={realm.adminTheme ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Email theme" labelFor="emailTheme" last>
                <Input id="emailTheme" name="emailTheme" defaultValue={realm.emailTheme ?? ""} disabled={disabled} />
              </SettingRow>
            </SettingsSection>
          </TabsContent>

          <TabsContent value="sessions" className="mt-0">
            <SettingsSection
              title="Sessions"
              description="Idle and max lifetimes, in seconds."
              canManage={canManage}
              onSubmit={async (form) => {
                const data = formData(form)
                await saveRealm({
                  ssoSessionIdleTimeout: number(data, "ssoSessionIdleTimeout"),
                  ssoSessionMaxLifespan: number(data, "ssoSessionMaxLifespan"),
                  ssoSessionIdleTimeoutRememberMe: number(data, "ssoSessionIdleTimeoutRememberMe"),
                  ssoSessionMaxLifespanRememberMe: number(data, "ssoSessionMaxLifespanRememberMe"),
                  clientSessionIdleTimeout: number(data, "clientSessionIdleTimeout"),
                  clientSessionMaxLifespan: number(data, "clientSessionMaxLifespan"),
                  offlineSessionIdleTimeout: number(data, "offlineSessionIdleTimeout"),
                  offlineSessionMaxLifespan: number(data, "offlineSessionMaxLifespan"),
                  offlineSessionMaxLifespanEnabled: checked(data, "offlineSessionMaxLifespanEnabled"),
                })
              }}
            >
              <SettingRow title="SSO idle" labelFor="ssoSessionIdleTimeout" compact>
                <Input id="ssoSessionIdleTimeout" name="ssoSessionIdleTimeout" type="number" defaultValue={realm.ssoSessionIdleTimeout ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="SSO max" labelFor="ssoSessionMaxLifespan" compact>
                <Input id="ssoSessionMaxLifespan" name="ssoSessionMaxLifespan" type="number" defaultValue={realm.ssoSessionMaxLifespan ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="SSO idle remember-me" labelFor="ssoSessionIdleTimeoutRememberMe" compact>
                <Input id="ssoSessionIdleTimeoutRememberMe" name="ssoSessionIdleTimeoutRememberMe" type="number" defaultValue={realm.ssoSessionIdleTimeoutRememberMe ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="SSO max remember-me" labelFor="ssoSessionMaxLifespanRememberMe" compact>
                <Input id="ssoSessionMaxLifespanRememberMe" name="ssoSessionMaxLifespanRememberMe" type="number" defaultValue={realm.ssoSessionMaxLifespanRememberMe ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Client idle" labelFor="clientSessionIdleTimeout" compact>
                <Input id="clientSessionIdleTimeout" name="clientSessionIdleTimeout" type="number" defaultValue={realm.clientSessionIdleTimeout ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Client max" labelFor="clientSessionMaxLifespan" compact>
                <Input id="clientSessionMaxLifespan" name="clientSessionMaxLifespan" type="number" defaultValue={realm.clientSessionMaxLifespan ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Offline idle" labelFor="offlineSessionIdleTimeout" compact>
                <Input id="offlineSessionIdleTimeout" name="offlineSessionIdleTimeout" type="number" defaultValue={realm.offlineSessionIdleTimeout ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Offline max" labelFor="offlineSessionMaxLifespan" compact>
                <Input id="offlineSessionMaxLifespan" name="offlineSessionMaxLifespan" type="number" defaultValue={realm.offlineSessionMaxLifespan ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Offline max lifespan" labelFor="offlineSessionMaxLifespanEnabled" compact last>
                <NamedSwitch id="offlineSessionMaxLifespanEnabled" name="offlineSessionMaxLifespanEnabled" defaultChecked={realm.offlineSessionMaxLifespanEnabled === true} disabled={disabled} />
              </SettingRow>
            </SettingsSection>
          </TabsContent>

          <TabsContent value="tokens" className="mt-0">
            <SettingsSection
              title="Tokens"
              description="Access, refresh, and action-token lifetimes."
              canManage={canManage}
              onSubmit={async (form) => {
                const data = formData(form)
                await saveRealm({
                  accessTokenLifespan: number(data, "accessTokenLifespan"),
                  accessTokenLifespanForImplicitFlow: number(data, "accessTokenLifespanForImplicitFlow"),
                  accessCodeLifespan: number(data, "accessCodeLifespan"),
                  accessCodeLifespanLogin: number(data, "accessCodeLifespanLogin"),
                  accessCodeLifespanUserAction: number(data, "accessCodeLifespanUserAction"),
                  actionTokenGeneratedByUserLifespan: number(data, "actionTokenGeneratedByUserLifespan"),
                  actionTokenGeneratedByAdminLifespan: number(data, "actionTokenGeneratedByAdminLifespan"),
                  refreshTokenMaxReuse: number(data, "refreshTokenMaxReuse"),
                  oauth2DeviceCodeLifespan: number(data, "oauth2DeviceCodeLifespan"),
                  oauth2DevicePollingInterval: number(data, "oauth2DevicePollingInterval"),
                  revokeRefreshToken: checked(data, "revokeRefreshToken"),
                })
              }}
            >
              <SettingRow title="Access token" labelFor="accessTokenLifespan" compact>
                <Input id="accessTokenLifespan" name="accessTokenLifespan" type="number" defaultValue={realm.accessTokenLifespan ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Implicit access token" labelFor="accessTokenLifespanForImplicitFlow" compact>
                <Input id="accessTokenLifespanForImplicitFlow" name="accessTokenLifespanForImplicitFlow" type="number" defaultValue={realm.accessTokenLifespanForImplicitFlow ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Login timeout" labelFor="accessCodeLifespan" compact>
                <Input id="accessCodeLifespan" name="accessCodeLifespan" type="number" defaultValue={realm.accessCodeLifespan ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Login action timeout" labelFor="accessCodeLifespanLogin" compact>
                <Input id="accessCodeLifespanLogin" name="accessCodeLifespanLogin" type="number" defaultValue={realm.accessCodeLifespanLogin ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="User action timeout" labelFor="accessCodeLifespanUserAction" compact>
                <Input id="accessCodeLifespanUserAction" name="accessCodeLifespanUserAction" type="number" defaultValue={realm.accessCodeLifespanUserAction ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="User action token" labelFor="actionTokenGeneratedByUserLifespan" compact>
                <Input id="actionTokenGeneratedByUserLifespan" name="actionTokenGeneratedByUserLifespan" type="number" defaultValue={realm.actionTokenGeneratedByUserLifespan ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Admin action token" labelFor="actionTokenGeneratedByAdminLifespan" compact>
                <Input id="actionTokenGeneratedByAdminLifespan" name="actionTokenGeneratedByAdminLifespan" type="number" defaultValue={realm.actionTokenGeneratedByAdminLifespan ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Refresh token max reuse" labelFor="refreshTokenMaxReuse" compact>
                <Input id="refreshTokenMaxReuse" name="refreshTokenMaxReuse" type="number" defaultValue={realm.refreshTokenMaxReuse ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Device code lifespan" labelFor="oauth2DeviceCodeLifespan" compact>
                <Input id="oauth2DeviceCodeLifespan" name="oauth2DeviceCodeLifespan" type="number" defaultValue={realm.oauth2DeviceCodeLifespan ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Device polling interval" labelFor="oauth2DevicePollingInterval" compact>
                <Input id="oauth2DevicePollingInterval" name="oauth2DevicePollingInterval" type="number" defaultValue={realm.oauth2DevicePollingInterval ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Revoke refresh token" labelFor="revokeRefreshToken" compact last>
                <NamedSwitch id="revokeRefreshToken" name="revokeRefreshToken" defaultChecked={realm.revokeRefreshToken === true} disabled={disabled} />
              </SettingRow>
            </SettingsSection>
          </TabsContent>

          <TabsContent value="security" className="mt-0">
            <SettingsSection
              title="Security defenses"
              description="Browser headers and brute-force detection."
              canManage={canManage}
              onSubmit={async (form) => {
                const data = formData(form)
                await saveRealm({
                  browserSecurityHeaders: {
                    ...headers,
                    xFrameOptions: text(data, "xFrameOptions"),
                    contentSecurityPolicy: text(data, "contentSecurityPolicy"),
                    contentSecurityPolicyReportOnly: text(data, "contentSecurityPolicyReportOnly"),
                    xContentTypeOptions: text(data, "xContentTypeOptions"),
                    xRobotsTag: text(data, "xRobotsTag"),
                    xXSSProtection: text(data, "xXSSProtection"),
                    strictTransportSecurity: text(data, "strictTransportSecurity"),
                    referrerPolicy: text(data, "referrerPolicy"),
                  },
                  bruteForceProtected: checked(data, "bruteForceProtected"),
                  permanentLockout: checked(data, "permanentLockout"),
                  maxFailureWaitSeconds: number(data, "maxFailureWaitSeconds"),
                  minimumQuickLoginWaitSeconds: number(data, "minimumQuickLoginWaitSeconds"),
                  waitIncrementSeconds: number(data, "waitIncrementSeconds"),
                  maxDeltaTimeSeconds: number(data, "maxDeltaTimeSeconds"),
                  failureFactor: number(data, "failureFactor"),
                  maxTemporaryLockouts: number(data, "maxTemporaryLockouts"),
                })
              }}
            >
              <SettingRow title="X-Frame-Options" labelFor="xFrameOptions">
                <Input id="xFrameOptions" name="xFrameOptions" defaultValue={headers.xFrameOptions ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Content-Security-Policy" labelFor="contentSecurityPolicy">
                <Input id="contentSecurityPolicy" name="contentSecurityPolicy" defaultValue={headers.contentSecurityPolicy ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="CSP report-only" labelFor="contentSecurityPolicyReportOnly">
                <Input id="contentSecurityPolicyReportOnly" name="contentSecurityPolicyReportOnly" defaultValue={headers.contentSecurityPolicyReportOnly ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="X-Content-Type-Options" labelFor="xContentTypeOptions">
                <Input id="xContentTypeOptions" name="xContentTypeOptions" defaultValue={headers.xContentTypeOptions ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="X-Robots-Tag" labelFor="xRobotsTag">
                <Input id="xRobotsTag" name="xRobotsTag" defaultValue={headers.xRobotsTag ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="X-XSS-Protection" labelFor="xXSSProtection">
                <Input id="xXSSProtection" name="xXSSProtection" defaultValue={headers.xXSSProtection ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Strict-Transport-Security" labelFor="strictTransportSecurity">
                <Input id="strictTransportSecurity" name="strictTransportSecurity" defaultValue={headers.strictTransportSecurity ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Referrer-Policy" labelFor="referrerPolicy">
                <Input id="referrerPolicy" name="referrerPolicy" defaultValue={headers.referrerPolicy ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Brute force detection" labelFor="bruteForceProtected" compact>
                <NamedSwitch id="bruteForceProtected" name="bruteForceProtected" defaultChecked={realm.bruteForceProtected === true} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Permanent lockout" labelFor="permanentLockout" compact>
                <NamedSwitch id="permanentLockout" name="permanentLockout" defaultChecked={realm.permanentLockout === true} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Max login failures" labelFor="failureFactor" compact>
                <Input id="failureFactor" name="failureFactor" type="number" defaultValue={realm.failureFactor ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Wait increment" labelFor="waitIncrementSeconds" compact>
                <Input id="waitIncrementSeconds" name="waitIncrementSeconds" type="number" defaultValue={realm.waitIncrementSeconds ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Max wait" labelFor="maxFailureWaitSeconds" compact>
                <Input id="maxFailureWaitSeconds" name="maxFailureWaitSeconds" type="number" defaultValue={realm.maxFailureWaitSeconds ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Failure reset time" labelFor="maxDeltaTimeSeconds" compact>
                <Input id="maxDeltaTimeSeconds" name="maxDeltaTimeSeconds" type="number" defaultValue={realm.maxDeltaTimeSeconds ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Quick login wait" labelFor="minimumQuickLoginWaitSeconds" compact>
                <Input id="minimumQuickLoginWaitSeconds" name="minimumQuickLoginWaitSeconds" type="number" defaultValue={realm.minimumQuickLoginWaitSeconds ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Max temporary lockouts" labelFor="maxTemporaryLockouts" compact last>
                <Input id="maxTemporaryLockouts" name="maxTemporaryLockouts" type="number" defaultValue={realm.maxTemporaryLockouts ?? ""} disabled={disabled} />
              </SettingRow>
            </SettingsSection>
          </TabsContent>

          <TabsContent value="localization" className="mt-0">
            <SettingsSection
              title="Localization"
              description="Default locale and supported languages."
              canManage={canManage}
              onSubmit={async (form) => {
                const data = formData(form)
                await saveRealm({
                  internationalizationEnabled: checked(data, "internationalizationEnabled"),
                  defaultLocale: text(data, "defaultLocale") || undefined,
                  supportedLocales: lines(data, "supportedLocales"),
                })
              }}
            >
              <SettingRow title="Internationalization" labelFor="internationalizationEnabled" compact>
                <NamedSwitch id="internationalizationEnabled" name="internationalizationEnabled" defaultChecked={realm.internationalizationEnabled === true} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Default locale" labelFor="defaultLocale" compact>
                <Input id="defaultLocale" name="defaultLocale" defaultValue={realm.defaultLocale ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Supported locales" description="One locale per line." labelFor="supportedLocales" stacked last>
                <Textarea
                  id="supportedLocales"
                  name="supportedLocales"
                  rows={3}
                  disabled={disabled}
                  defaultValue={(realm.supportedLocales ?? []).join("\n")}
                  placeholder={"en\nfr"}
                />
              </SettingRow>
            </SettingsSection>
          </TabsContent>

          <TabsContent value="events" className="mt-0">
            <SettingsSection
              title="Events"
              description="User and admin event storage."
              canManage={canManage}
              onSubmit={async (form) => {
                const data = formData(form)
                try {
                  await updateRealmEventsAction(realmName, {
                    eventsEnabled: checked(data, "eventsEnabled"),
                    adminEventsEnabled: checked(data, "adminEventsEnabled"),
                    adminEventsDetailsEnabled: checked(data, "adminEventsDetailsEnabled"),
                    eventsExpiration: number(data, "eventsExpiration"),
                    eventsListeners: lines(data, "eventsListeners"),
                    enabledEventTypes: lines(data, "enabledEventTypes"),
                  })
                  toast.success("Event settings saved")
                  router.refresh()
                } catch (error) {
                  toast.error("Could not save events", {
                    description: error instanceof Error ? error.message : undefined,
                  })
                  throw error
                }
              }}
            >
              <SettingRow title="Save events" labelFor="eventsEnabled" compact>
                <NamedSwitch id="eventsEnabled" name="eventsEnabled" defaultChecked={events.eventsEnabled === true} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Save admin events" labelFor="adminEventsEnabled" compact>
                <NamedSwitch id="adminEventsEnabled" name="adminEventsEnabled" defaultChecked={events.adminEventsEnabled === true} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Admin event details" labelFor="adminEventsDetailsEnabled" compact>
                <NamedSwitch id="adminEventsDetailsEnabled" name="adminEventsDetailsEnabled" defaultChecked={events.adminEventsDetailsEnabled === true} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Expiration" labelFor="eventsExpiration" compact>
                <Input id="eventsExpiration" name="eventsExpiration" type="number" defaultValue={events.eventsExpiration ?? ""} disabled={disabled} />
              </SettingRow>
              <SettingRow title="Listeners" labelFor="eventsListeners" stacked>
                <Textarea id="eventsListeners" name="eventsListeners" rows={2} disabled={disabled} defaultValue={(events.eventsListeners ?? []).join("\n")} />
              </SettingRow>
              <SettingRow title="Saved event types" labelFor="enabledEventTypes" stacked last>
                <Textarea id="enabledEventTypes" name="enabledEventTypes" rows={6} disabled={disabled} defaultValue={(events.enabledEventTypes ?? []).join("\n")} />
              </SettingRow>
            </SettingsSection>
          </TabsContent>

          <TabsContent value="keys" className="mt-0">
            <RealmKeysGrid realmName={realmName} keys={keys} />
          </TabsContent>

          <TabsContent value="profile" className="mt-0">
            <SettingsSection
              title="User profile"
              description="Unmanaged attributes and profile JSON."
              canManage={canManage}
              onSubmit={async (form) => {
                const data = formData(form)
                let parsed: UserProfileConfig
                try {
                  parsed = JSON.parse(text(data, "userProfile")) as UserProfileConfig
                } catch {
                  toastFormError(
                    "Could not save user profile",
                    "User profile JSON is invalid",
                  )
                  return
                }
                parsed.unmanagedAttributePolicy = text(
                  data,
                  "unmanagedAttributePolicy",
                ) as UserProfileConfig["unmanagedAttributePolicy"]
                const result = await updateRealmUserProfileAction(
                  realmName,
                  parsed,
                )
                if (!result.ok) {
                  toastFormError("Could not save user profile", result.error)
                  return
                }
                toast.success("User profile saved")
                router.refresh()
              }}
            >
              <SettingRow title="Unmanaged attributes" labelFor="unmanagedAttributePolicy" compact>
                <select
                  id="unmanagedAttributePolicy"
                  name="unmanagedAttributePolicy"
                  defaultValue={userProfile.unmanagedAttributePolicy ?? "DISABLED"}
                  disabled={disabled}
                  className="border-input bg-transparent dark:bg-input/30 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                >
                  <option value="DISABLED">Disabled</option>
                  <option value="ENABLED">Enabled</option>
                  <option value="ADMIN_VIEW">Admin view</option>
                  <option value="ADMIN_EDIT">Admin edit</option>
                </select>
              </SettingRow>
              <SettingRow title="Profile configuration" labelFor="userProfile" stacked last>
                <Textarea
                  id="userProfile"
                  name="userProfile"
                  rows={18}
                  disabled={disabled}
                  defaultValue={profileJson}
                  className="font-mono text-xs"
                />
              </SettingRow>
            </SettingsSection>
          </TabsContent>

          <TabsContent value="policies" className="mt-0">
            <SettingsSection
              title="Client policies"
              description="Profiles and policies as JSON."
              canManage={canManage}
              onSubmit={async (form) => {
                const data = formData(form)
                let policies: ClientPoliciesRepresentation
                let profiles: ClientProfilesRepresentation
                try {
                  policies = { policies: JSON.parse(text(data, "policies") || "[]") }
                  profiles = { profiles: JSON.parse(text(data, "profiles") || "[]") }
                } catch {
                  toast.error("Client policy JSON is invalid")
                  throw new Error("Invalid JSON")
                }
                try {
                  await updateRealmClientPoliciesAction(realmName, {
                    policies,
                    profiles,
                  })
                  toast.success("Client policies saved")
                  router.refresh()
                } catch (error) {
                  toast.error("Could not save client policies", {
                    description: error instanceof Error ? error.message : undefined,
                  })
                  throw error
                }
              }}
            >
              <SettingRow title="Profiles" labelFor="profiles" stacked>
                <Textarea id="profiles" name="profiles" rows={12} disabled={disabled} defaultValue={profilesJson} className="font-mono text-xs" />
              </SettingRow>
              <SettingRow title="Policies" labelFor="policies" stacked last>
                <Textarea id="policies" name="policies" rows={12} disabled={disabled} defaultValue={policiesJson} className="font-mono text-xs" />
              </SettingRow>
            </SettingsSection>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
