export function withSheetParams(
  current: URLSearchParams,
  next: { create?: boolean; edit?: string | null },
) {
  const params = new URLSearchParams(current.toString())
  params.delete("create")
  params.delete("edit")
  if (next.create) params.set("create", "1")
  if (next.edit) params.set("edit", next.edit)
  return params.toString()
}
