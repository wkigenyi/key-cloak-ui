import { read, utils } from "xlsx"
import {
  importRowsFromRecords,
  parseImportFile,
  type ImportFileRow,
} from "@/lib/import/user-file"

function isSpreadsheetName(fileName: string) {
  return /\.xlsx?$/i.test(fileName)
}

export function parseImportSpreadsheet(buffer: ArrayBuffer): ImportFileRow[] {
  const workbook = read(buffer, { type: "array", cellDates: false })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error("The workbook has no sheets.")
  }
  const sheet = workbook.Sheets[sheetName]
  const records = utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
    blankrows: false,
  })
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("The first sheet has no data rows.")
  }
  return importRowsFromRecords(records)
}

export async function parseImportUpload(file: File): Promise<ImportFileRow[]> {
  if (isSpreadsheetName(file.name)) {
    return parseImportSpreadsheet(await file.arrayBuffer())
  }
  return parseImportFile(await file.text(), file.name)
}
