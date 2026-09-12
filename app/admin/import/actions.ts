"use server"

import { revalidatePath } from "next/cache"
import { importSelfHelpUsers, type ImportUserRow } from "@/lib/keycloak/admin"

export async function importUsersChunkAction(rows: ImportUserRow[]) {
  const result = await importSelfHelpUsers(rows)
  revalidatePath("/admin/users")
  return {
    created: result.created,
    updated: result.updated,
    skipped: result.skipped,
    realm: result.realm,
    failures: result.results
      .filter((item) => item.status === "skipped")
      .map((item) => ({ username: item.username, reason: item.reason })),
  }
}
