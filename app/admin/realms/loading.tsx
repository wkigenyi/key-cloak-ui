import { DirectoryGridSkeleton } from "@/components/admin/page-skeletons"

export default function RealmsLoading() {
  return (
    <DirectoryGridSkeleton title="Realms" status="Loading realms…" chips={0} />
  )
}
