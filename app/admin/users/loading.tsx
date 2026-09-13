import { DirectoryGridSkeleton } from "@/components/admin/page-skeletons"

export default function UsersLoading() {
  return (
    <DirectoryGridSkeleton title="Self Help Users" status="Loading users…" />
  )
}
