"use server"

import { revalidatePath } from "next/cache"
import { importSelfHelpUsers, type ImportUserRow } from "@/lib/keycloak/admin"
import { asActionResult } from "@/lib/keycloak/errors"

export async function importUsersChunkAction(rows: ImportUserRow[]) {
  return asActionResult(async () => {
    const result = await importSelfHelpUsers(rows)
    return {
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      realm: result.realm,
      results: result.results,
      failures: result.results
        .filter((item) => item.status === "skipped")
        .map((item) => ({ username: item.username, reason: item.reason })),
    }
  }, "Could not import users")
}

export async function importOneUserAction(row: ImportUserRow) {
  return asActionResult(async () => {
    const result = await importSelfHelpUsers([row])
    const item = result.results[0]
    if (!item) {
      throw new Error("Import returned no result")
    }
    return item
  }, "Could not import user")
}

export async function finishImportAction() {
  revalidatePath("/admin/users")
}
