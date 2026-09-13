import { notFound } from "next/navigation"
import { ClientDetail } from "@/components/admin/client-detail"
import { getClientDetail } from "@/lib/keycloak/oidc-clients"

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await getClientDetail(id)
  if (!detail) notFound()

  return <ClientDetail detail={detail} />
}
