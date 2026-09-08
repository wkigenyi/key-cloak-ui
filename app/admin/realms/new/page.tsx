import { redirect } from "next/navigation"

export default function NewRealmPage() {
  redirect("/admin/realms?create=1")
}
