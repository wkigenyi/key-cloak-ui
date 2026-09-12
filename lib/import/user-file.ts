export type ImportFileRow = {
  username: string
  clientId: string
  password?: string
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
}

const ALIASES: Record<string, keyof ImportFileRow> = {
  username: "username",
  phone: "phone",
  clientid: "clientId",
  client_id: "clientId",
  fineract_client_id: "clientId",
  password: "password",
  email: "email",
  firstname: "firstName",
  first_name: "firstName",
  lastname: "lastName",
  last_name: "lastName",
}

function headerKey(value: string) {
  return value.trim().toLowerCase().replace(/^\ufeff/, "")
}

function cell(value: unknown) {
  return String(value ?? "").trim()
}

function fromRecord(record: Record<string, unknown>): ImportFileRow {
  const mapped: Partial<ImportFileRow> = {}
  for (const [rawKey, rawValue] of Object.entries(record)) {
    const field = ALIASES[headerKey(rawKey)]
    if (!field) continue
    const value = cell(rawValue)
    if (!value) continue
    mapped[field] = value
  }
  const username = mapped.username || mapped.phone || ""
  return {
    username,
    clientId: mapped.clientId || "",
    password: mapped.password,
    email: mapped.email,
    firstName: mapped.firstName,
    lastName: mapped.lastName,
    phone: mapped.phone || (username || undefined),
  }
}

function splitCsvLine(line: string) {
  const cells: string[] = []
  let current = ""
  let quoted = false
  for (let index = 0; index < line.length; index++) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        quoted = !quoted
      }
      continue
    }
    if (char === "," && !quoted) {
      cells.push(current)
      current = ""
      continue
    }
    current += char
  }
  cells.push(current)
  return cells
}

function parseCsv(text: string): ImportFileRow[] {
  const lines = text.replace(/^\ufeff/, "").split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]).map(headerKey)
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line)
    const record: Record<string, unknown> = {}
    headers.forEach((header, index) => {
      record[header] = values[index] ?? ""
    })
    return fromRecord(record)
  })
}

export function parseImportFile(text: string, fileName = ""): ImportFileRow[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  const asJson = fileName.toLowerCase().endsWith(".json") || trimmed.startsWith("[")
  if (asJson) {
    const parsed = JSON.parse(trimmed) as unknown
    if (!Array.isArray(parsed)) {
      throw new Error("JSON import must be an array of users.")
    }
    return parsed.map((item) => fromRecord((item ?? {}) as Record<string, unknown>))
  }
  return parseCsv(trimmed)
}

export function summarizeImportRows(rows: ImportFileRow[]) {
  const ready = rows.filter((row) => row.username && row.clientId)
  const skipped = rows.length - ready.length
  const withPassword = ready.filter((row) => Boolean(row.password)).length
  return {
    total: rows.length,
    ready: ready.length,
    skipped,
    withPassword,
    withoutPassword: ready.length - withPassword,
    rows: ready,
  }
}
