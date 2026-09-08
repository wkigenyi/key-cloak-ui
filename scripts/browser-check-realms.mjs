/**
 * Browser check: realm-per-SACCO isolation.
 * Requires: playwright-core and a running app on APP_URL.
 */
import { chromium } from "playwright-core"

const app = process.env.APP_URL ?? "http://localhost:3000"
const realmName = `acme-sacco-${String(Date.now()).slice(-6)}`
const phone = `+2567000${String(Date.now()).slice(-6)}`

async function signIn(page) {
  await page.goto(`${app}/login`)
  await page.getByRole("button", { name: /sign in with keycloak/i }).click()
  await page.locator("#username").fill("console-admin")
  await page.locator("#password").fill("admin")
  await page.locator("#kc-login").click()
  await page.waitForURL("**/admin/**")
}

async function assertNoDelete(page, name) {
  const row = page.getByRole("row").filter({ hasText: name }).first()
  await row.getByRole("button", { name: "Row actions" }).click()
  const menu = page.locator("[role=menu]")
  await menu.waitFor()
  const menuText = await menu.innerText()
  if (menuText.includes("Delete")) {
    throw new Error(`Delete must be hidden for ${name}`)
  }
  await page.keyboard.press("Escape")
  await menu.waitFor({ state: "hidden" })
}

async function createSelfHelpUser(page, username, clientId) {
  await page.getByRole("button", { name: "Create self-help user" }).click()
  await page.waitForURL(/create=1/)
  await page.locator("#username").fill(username)
  await page.locator("#clientId").fill(clientId)
  await page.locator("#phone").fill(username)
  await page.locator("#password").fill("temp-verify")
  await page.getByRole("button", { name: "Create user" }).click()
  await page.waitForURL(/edit=[0-9a-f-]+/)
  await page.getByText("Self-help user created").waitFor()
  const saccoId = await page.locator("#saccoId").inputValue()
  await page.getByRole("button", { name: "Cancel" }).click()
  await page.waitForURL((url) => !url.searchParams.has("edit"))
  return saccoId
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.setDefaultTimeout(25000)

  try {
    await signIn(page)

    await page.goto(`${app}/admin/realms`)
    await page.locator("#page-heading").waitFor()
    if (!(await page.locator("#page-heading").innerText()).includes("Realms")) {
      throw new Error("Expected Realms heading")
    }
    await page.getByText("master", { exact: true }).first().waitFor()
    await page.getByText("app", { exact: true }).first().waitFor()
    await assertNoDelete(page, "master")
    await assertNoDelete(page, "app")

    await page.getByRole("button", { name: "Create SACCO" }).click()
    await page.waitForURL(/create=1/)
    await page.locator("#realm").fill(realmName)
    await page.locator("#displayName").fill("Acme SACCO")
    await page.getByRole("button", { name: "Create SACCO", exact: true }).click()
    await page.waitForURL("**/admin/users**")
    await page.getByText(`in ${realmName}`).first().waitFor()

    const createdSacco = await createSelfHelpUser(page, phone, "9101")
    if (createdSacco !== realmName) {
      throw new Error(`Expected saccoId ${realmName}, got ${createdSacco}`)
    }

    await page.goto(`${app}/admin/clients`)
    await page.getByText("self-help").first().waitFor()

    await page.getByLabel("Selected realm").click()
    await page.getByRole("option", { name: "app", exact: true }).click()
    await page.getByLabel("Selected realm").filter({ hasText: "app" }).waitFor()
    await page.goto(`${app}/admin/users`)
    await page.getByText("in app").first().waitFor()
    const appSacco = await createSelfHelpUser(page, phone, "9102")
    if (appSacco !== "app") {
      throw new Error(`Expected saccoId app, got ${appSacco}`)
    }

    await page.goto(`${app}/admin/realms/${encodeURIComponent(realmName)}?tab=login`)
    await page.getByRole("checkbox", { name: "User registration" }).click()
    await page.getByRole("button", { name: "Save changes" }).click()
    await page.getByText("Realm settings saved").waitFor()

    await page.goto(`${app}/admin/realms/app?tab=login`)
    const appRegistration = page.getByRole("checkbox", { name: "User registration" })
    await appRegistration.waitFor()
    if (await appRegistration.isChecked()) {
      throw new Error("app user registration should stay off")
    }

    await page.goto(`${app}/admin/realms`)
    const created = page.getByRole("row").filter({ hasText: realmName }).first()
    await created.getByRole("button", { name: "Row actions" }).click()
    await page.getByRole("menuitem", { name: "Delete" }).click()
    await page.getByRole("button", { name: "Delete" }).click()
    await page.getByText("Realm deleted").waitFor()
    await page.getByRole("row").filter({ hasText: realmName }).waitFor({ state: "hidden" })

    console.log(
      `browser-check realms ok: cloned ${realmName}, same phone ${phone} in app + SACCO, policy isolated`,
    )
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
