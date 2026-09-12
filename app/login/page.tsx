import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { signInAction } from "@/app/login/actions"
import { ThemeToggle } from "@/components/admin/theme-toggle"
import { FormSubmitButton } from "@/components/admin/form-submit-button"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"

const ERROR_COPY: Record<string, string> = {
  Configuration:
    "Could not reach Keycloak’s sign-in endpoint. Confirm it is running at the issuer URL in .env.local.",
  AccessDenied:
    "Keycloak accepted the login but this account cannot use the admin console.",
  OAuthCallback:
    "Keycloak returned an error after sign-in. Check the client redirect URI and secret.",
  Callback:
    "Keycloak returned an error after sign-in. Check the client redirect URI and secret.",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const session = await auth()
  if (session?.user && !session.error) {
    redirect("/admin/users")
  }

  const { callbackUrl, error } = await searchParams
  const errorMessage = error
    ? (ERROR_COPY[error] ?? `Sign-in failed (${error}).`)
    : null

  return (
    <main className="relative flex min-h-svh items-center justify-center p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Frame spacing="default" className="w-full max-w-md">
        <FrameHeader>
          <FrameTitle>Keycloak Admin</FrameTitle>
          <FrameDescription>
            Sign in with Keycloak to manage realms, users, and clients.
          </FrameDescription>
        </FrameHeader>
        <FramePanel className="space-y-4">
          {errorMessage ? (
            <p
              role="alert"
              className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm"
            >
              {errorMessage}
            </p>
          ) : null}
          <form
            action={async () => {
              "use server"
              await signInAction(callbackUrl)
            }}
          >
            <FormSubmitButton className="w-full" pendingLabel="Redirecting…">
              Sign in with Keycloak
            </FormSubmitButton>
          </form>
          <p className="text-muted-foreground text-xs">
            Local demo: console-admin / admin
          </p>
        </FramePanel>
      </Frame>
    </main>
  )
}
