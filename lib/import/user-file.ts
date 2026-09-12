export type ImportFileRow = {
  username: string
  clientId: string
  password?: string
  email?: string
  rawEmail?: string
  firstName?: string
  lastName?: string
  phone?: string
  externalId?: string
  rowNumber: number
}

export type ImportReviewRow = ImportFileRow & {
  valid: boolean
  reason?: string
}

export type ImportRowProgress = {
  status: "pending" | "importing" | "done" | "failed"
  profile?: boolean
  password?: boolean
  email?: boolean
  reason?: string
}

export type FlaggedImportRow = {
  rowNumber: number
  label: string
  reason: string
}

export function sanitizeImportUsername(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (trimmed.includes("@")) return trimmed
  return trimmed.replace(/\D/g, "")
}

export function normalizeImportEmail(value: string | undefined) {
  const email = value?.trim().toLowerCase()
  if (!email) return undefined
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return undefined
  return email
}

export function flagImportRow(row: ImportFileRow): string | undefined {
  if (!row.username) return "Phone or email is required"
  if (!row.clientId) return "clientId is required"
  if (!row.externalId) return "externalId is required"
  return undefined
}

function rowLabel(row: ImportFileRow) {
  return row.username || row.email || row.phone || `Row ${row.rowNumber}`
}

export const IMPORT_TEMPLATE_CSV = `phone,email,clientId,externalId,firstName,lastName
+256700000001,alice@example.com,1001,EXT-1001,Alice,Nguyen
,bob@example.com,1002,EXT-1002,Bob,Okoye
`

const ALIASES: Record<string, keyof ImportFileRow> = {
  phone: "phone",
  email: "email",
  clientid: "clientId",
  fineractclientid: "clientId",
  externalid: "externalId",
  firstname: "firstName",
  lastname: "lastName",
}

function headerKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^\ufeff/, "")
    .replace(/[\s_-]+/g, "")
}

export function expandSpreadsheetNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Number.isSafeInteger(value)) return String(value)
    const asInt = Math.round(value)
    if (Number.isSafeInteger(asInt)) return String(asInt)
    return String(value).trim()
  }

  const text = String(value ?? "").trim()
  const match = text.match(/^([+-])?(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/)
  if (!match) return text

  const sign = match[1] === "-" ? "-" : ""
  const intPart = match[2]
  const fracPart = match[3] ?? ""
  const exp = Number(match[4])
  if (!Number.isFinite(exp) || exp > 20 || exp < 0 || sign === "-") {
    return text
  }

  const digits = intPart + fracPart
  const point = intPart.length + exp
  if (point < digits.length) {
    const fraction = digits.slice(point).replace(/0+$/, "")
    if (fraction) return text
    return digits.slice(0, point).replace(/^0+(?=\d)/, "")
  }
  return (digits + "0".repeat(point - digits.length)).replace(/^0+(?=\d)/, "")
}

function cell(value: unknown) {
  return expandSpreadsheetNumber(value)
}

function fromRecord(
  record: Record<string, unknown>,
  rowNumber: number,
): ImportFileRow {
  const mapped: Partial<ImportFileRow> = {}
  for (const [rawKey, rawValue] of Object.entries(record)) {
    const field = ALIASES[headerKey(rawKey)]
    if (!field) continue
    const value = cell(rawValue)
    if (!value) continue
    mapped[field] = value
  }
  const phone = mapped.phone || ""
  const rawEmail = mapped.email || ""
  const email = normalizeImportEmail(rawEmail)
  const username = sanitizeImportUsername(phone) || email || ""
  const externalId = mapped.externalId || ""
  return {
    username,
    clientId: mapped.clientId || "",
    password: externalId || undefined,
    email,
    rawEmail: rawEmail || undefined,
    firstName: mapped.firstName,
    lastName: mapped.lastName,
    phone: phone || undefined,
    externalId: externalId || undefined,
    rowNumber,
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
  return lines.slice(1).map((line, index) => {
    const values = splitCsvLine(line)
    const record: Record<string, unknown> = {}
    headers.forEach((header, column) => {
      record[header] = values[column] ?? ""
    })
    return fromRecord(record, index + 2)
  })
}

export function importRowsFromRecords(records: Record<string, unknown>[]) {
  return records
    .map((record, index) => fromRecord(record, index + 2))
    .filter(
      (row) =>
        row.username ||
        row.clientId ||
        row.externalId ||
        row.phone ||
        row.rawEmail ||
        row.firstName ||
        row.lastName,
    )
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
    return parsed.map((item, index) =>
      fromRecord((item ?? {}) as Record<string, unknown>, index + 1),
    )
  }
  return parseCsv(trimmed)
}

export function summarizeImportRows(rows: ImportFileRow[]) {
  const flagged: FlaggedImportRow[] = []
  const ready: ImportFileRow[] = []
  for (const row of rows) {
    const reason = flagImportRow(row)
    if (reason) {
      flagged.push({
        rowNumber: row.rowNumber,
        label: rowLabel(row),
        reason,
      })
      continue
    }
    ready.push(row)
  }
  return {
    total: rows.length,
    ready: ready.length,
    skipped: flagged.length,
    flagged,
    rows: ready,
  }
}

export function reviewImportRows(rows: ImportFileRow[]): ImportReviewRow[] {
  return rows.map((row) => {
    const reason = flagImportRow(row)
    return {
      ...row,
      valid: !reason,
      reason,
    }
  })
}
