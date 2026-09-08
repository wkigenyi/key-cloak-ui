/**
 * Browser check for the OIDC clients UI.
 * Requires: pnpm add -D playwright-core
 */
import { chromium } from "playwright-core"

const app = process.env.APP_URL ?? "http://localhost:3000"
const clientId = `demo-app-${String(Date.now()).slice(-6)}`

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.setDefaultTimeout(20000)

  try {
    await page.goto(`${app}/login`)
    await page.getByRole("button", { name: /sign in with keycloak/i }).click()
    await page.locator("#username").fill("console-admin")
    await page.locator("#password").fill("admin")
    await page.locator("#kc-login").click()
    await page.waitForURL("**/admin/**")

    await page.goto(`${app}/admin/clients`)
    await page.locator("#page-heading").waitFor()
    const heading = await page.locator("#page-heading").innerText()
    if (!heading.includes("Clients")) {
      throw new Error(`Unexpected title: ${heading}`)
    }
    await page.getByText("self-help").first().waitFor()

    await page.getByRole("button", { name: "Built-in" }).click()
    await page.waitForURL(/kind=built-in/)
    await page.getByText("realm-management").first().waitFor()

    await page.getByRole("button", { name: "Applications", exact: true }).click()
    await page.getByRole("button", { name: "Create client" }).click()
    await page.waitForURL(/create=1/)
    await page.locator("#clientId").waitFor()

    await page.locator("#clientId").fill(clientId)
    await page.locator("#name").fill("Demo App")
    await page.locator("#rootUrl").fill("http://localhost:4000")
    await page.locator("#redirectUris").fill("http://localhost:4000/callback")
    await page.locator("#webOrigins").fill("http://localhost:4000")
    await page.getByRole("button", { name: "Create application" }).click()
    await page.waitForURL(/edit=[0-9a-f-]+/)
    await page.locator("#clientId").waitFor()
    const createdId = await page.locator("#clientId").inputValue()
    if (createdId !== clientId) {
      throw new Error(`Create did not persist clientId: ${createdId}`)
    }

    await page.locator("#name").fill("Demo App Edited")
    await page.getByRole("button", { name: "Save changes" }).click()
    await page.waitForTimeout(800)
    const name = await page.locator("#name").inputValue()
    if (name !== "Demo App Edited") {
      throw new Error(`Edit did not persist name: ${name}`)
    }

    const enabled = page.getByRole("checkbox", { name: "Enabled" })
    if (await enabled.isChecked()) await enabled.click()
    await page.getByRole("button", { name: "Save changes" }).click()
    await page.waitForTimeout(800)
    if (await enabled.isChecked()) {
      throw new Error("Disable did not persist")
    }

    await page.getByRole("button", { name: "Cancel" }).click()
    await page.waitForURL((url) => !url.searchParams.has("edit"))
    await page.locator("#page-heading").waitFor()
    await page.locator("#clientId").waitFor({ state: "hidden" })

    await page.getByRole("button", { name: "Row actions" }).first().click()
    await page.getByRole("menuitem", { name: "Edit client" }).click()
    await page.waitForURL(/edit=/)
    await page.locator("#clientId").waitFor()

    console.log(`browser-check clients ok: created ${clientId}, edited, disabled`)
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
