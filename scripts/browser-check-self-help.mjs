/**
 * Browser check against the running Next.js app + Docker Keycloak.
 * Uses the machine Chrome install (no Playwright browser download).
 *
 * Requires: pnpm add -D playwright-core
 */
import { chromium } from "playwright-core"

const app = process.env.APP_URL ?? "http://localhost:3000"
const username = `+2567000${String(Date.now()).slice(-6)}`

async function main() {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.setDefaultTimeout(20000)

  try {
    await page.goto(`${app}/login`)
    await page.getByRole("button", { name: /sign in with keycloak/i }).click()
    await page.locator("#username").fill("console-admin")
    await page.locator("#password").fill("admin")
    await page.locator("#kc-login").click()
    await page.waitForURL("**/admin/users**")

    await page.locator("#page-heading").waitFor()
    const heading = await page.locator("#page-heading").innerText()
    if (!heading.includes("Self Help Users")) {
      throw new Error(`Unexpected directory title: ${heading}`)
    }
    const body = await page.locator("body").innerText()
    if (!body.includes("alice") && !body.includes("1001")) {
      throw new Error("Directory did not show a seeded self-help user")
    }
    if (!body.includes("demo-sacco") && !body.includes("app")) {
      throw new Error("Directory did not show a SACCO id")
    }

    await page.getByRole("button", { name: "Operators" }).click()
    await page.waitForURL(/kind=operators/)
    await page.getByText(/console-admin|Console Admin/i).first().waitFor()

    await page.getByRole("button", { name: "Self-help", exact: true }).click()
    await page.getByRole("button", { name: "Create self-help user" }).click()
    await page.waitForURL(/create=1/)
    await page.locator("#username").waitFor()

    await page.locator("#username").fill(username)
    await page.locator("#clientId").fill("8888")
    await page.locator("#phone").fill(username)
    await page.locator("#email").fill(`nia.${Date.now()}@example.com`)
    await page.locator("#firstName").fill("Nia")
    await page.locator("#lastName").fill("Okello")
    await page.locator("#password").fill("temp-verify")
    await page.getByRole("button", { name: "Create user" }).click()
    await page.waitForURL(/edit=[0-9a-f-]+/)
    await page.locator("#clientId").waitFor()
    await page.getByText("Self-help user created").waitFor()

    const clientId = await page.locator("#clientId").inputValue()
    const saccoId = await page.locator("#saccoId").inputValue()
    if (clientId !== "8888" || saccoId !== "app") {
      throw new Error(
        `Created user detail missing attributes: clientId=${clientId} saccoId=${saccoId}`,
      )
    }

    await page.locator("#lastName").fill("Okello-Edited")
    await page.getByRole("button", { name: "Save changes" }).click()
    await page.waitForTimeout(800)
    const lastName = await page.locator("#lastName").inputValue()
    if (lastName !== "Okello-Edited") {
      throw new Error(`Edit did not persist last name: ${lastName}`)
    }

    const enabled = page.getByRole("checkbox", { name: "Enabled" })
    if (await enabled.isChecked()) {
      await enabled.click()
    }
    await page.getByRole("button", { name: "Save changes" }).click()
    await page.waitForTimeout(800)
    if (await enabled.isChecked()) {
      throw new Error("Disable did not persist")
    }

    await page.locator("#reset-password").fill("reset-verify")
    await page.getByRole("button", { name: /reset password/i }).click()
    await page.waitForTimeout(500)

    await page.getByRole("button", { name: "Cancel" }).click()
    await page.waitForURL((url) => !url.searchParams.has("edit"))
    await page.locator("#page-heading").waitFor()
    await page.locator("#username").waitFor({ state: "hidden" })

    await page.getByRole("button", { name: "Row actions" }).first().click()
    await page.getByRole("menuitem", { name: "Edit user" }).click()
    await page.waitForURL(/edit=/)
    await page.locator("#username").waitFor()

    console.log(`browser-check ok: created ${username}, edited, disabled, reset`)
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
