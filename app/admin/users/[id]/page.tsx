import { notFound } from "next/navigation"
import { MemberDetail } from "@/components/blocks/solution-users-2/components/member-detail"
import { getUserDetail } from "@/lib/keycloak/admin"
import { getWorkspaceRealm } from "@/lib/keycloak/workspace"

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [detail, saccoId] = await Promise.all([
    getUserDetail(id),
    getWorkspaceRealm(),
  ])
  if (!detail) notFound()

  return <MemberDetail detail={detail} saccoId={saccoId} />
}
