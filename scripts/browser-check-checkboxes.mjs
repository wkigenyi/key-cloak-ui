import { chromium } from "playwright-core"

const app = process.env.APP_URL ?? "http://localhost:3000"

async function signIn(page) {
  await page.goto(`${app}/login`)
  await page.getByRole("button", { name: /sign in with keycloak/i }).click()
  await page.locator("#username").fill("console-admin")
  await page.locator("#password").fill("admin")
  await page.locator("#kc-login").click()
  await page.waitForURL("**/admin/**")
}

async function assertFormCheckboxes(page, url, minCount) {
  await page.goto(`${app}${url}`)
  await page.locator("form [data-slot=checkbox]").first().waitFor()
  const styled = await page.locator("form [data-slot=checkbox]").count()
  if (styled < minCount) {
    throw new Error(`${url}: expected >=${minCount} styled checkboxes, got ${styled}`)
  }
  const box = await page.locator("form [data-slot=checkbox]").first().boundingBox()
  if (!box || box.width < 12 || box.height < 12) {
    throw new Error(`${url}: styled checkbox has no visible box`)
  }
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.setDefaultTimeout(20000)
  try {
    await signIn(page)
    await assertFormCheckboxes(page, "/admin/users?create=1", 2)
    await page.getByRole("checkbox", { name: "Enabled" }).click()
    await page.getByRole("checkbox", { name: "Password is temporary" }).click()

    await assertFormCheckboxes(page, "/admin/clients?create=1", 5)
    await page.getByRole("checkbox", { name: /public client/i }).click()
    await page.getByRole("checkbox", { name: "Enabled" }).waitFor()
    console.log("checkbox-check ok: styled shadcn checkboxes on user and client forms")
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
