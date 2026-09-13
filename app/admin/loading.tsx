import { DirectoryGridSkeleton } from "@/components/admin/page-skeletons"

export default function AdminLoading() {
  return (
    <DirectoryGridSkeleton title="Loading" status="Loading this page…" chips={0} />
  )
}
