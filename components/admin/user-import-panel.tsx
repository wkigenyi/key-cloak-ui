"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { CircleAlertIcon, FileSpreadsheetIcon, UploadIcon, UsersIcon } from "lucide-react"
import {
  finishImportAction,
  importOneUserAction,
} from "@/app/admin/import/actions"
import {
  IMPORT_TEMPLATE_CSV,
  summarizeImportRows,
  type ImportFileRow,
  type ImportRowProgress,
} from "@/lib/import/user-file"
import { parseImportUpload } from "@/lib/import/spreadsheet"
import { formatBytes, useFileUpload } from "@/hooks/use-file-upload"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert"
import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { ImportReviewGrid } from "@/components/admin/import-review-grid"
import { PendingSubmitContent } from "@/components/admin/form-submit-button"
import { Button } from "@/components/ui/button"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import { cn } from "@/lib/utils"

const ROW_TIMEOUT_MS = 55_000

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Import timed out")),
      ms,
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

type Props = {
  realm: string
  canManage: boolean
  blocked: boolean
}

export function UserImportPanel({ realm, canManage, blocked }: Props) {
  const [parseError, setParseError] = useState("")
  const [rows, setRows] = useState<ImportFileRow[]>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [created, setCreated] = useState(0)
  const [updated, setUpdated] = useState(0)
  const [skipped, setSkipped] = useState(0)
  const [processed, setProcessed] = useState(0)
  const [failures, setFailures] = useState<{ username: string; reason?: string }[]>(
    [],
  )
  const [progressByRow, setProgressByRow] = useState<
    Record<number, ImportRowProgress>
  >({})
  const [activeRowNumber, setActiveRowNumber] = useState<number>()
  const [lastCompleted, setLastCompleted] = useState("")
  const cancelledRef = useRef(false)

  const [
    { isDragging, errors, files },
    {
      clearFiles,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
  ] = useFileUpload({
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    accept:
      ".csv,.xlsx,.xls,.json,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel",
    multiple: false,
    onFilesChange: async (next) => {
      const file = next[0]?.file
      if (!(file instanceof File)) {
        setRows([])
        setParseError("")
        resetProgress()
        setProgressByRow({})
        return
      }
      try {
        const parsed = await parseImportUpload(file)
        setRows(parsed)
        setParseError("")
        resetProgress()
      } catch (error) {
        setRows([])
        setParseError(
          error instanceof Error ? error.message : "Could not read that file.",
        )
      }
    },
  })

  const summary = useMemo(() => summarizeImportRows(rows), [rows])
  const progress = summary.ready
    ? Math.round((processed / summary.ready) * 100)
    : 0

  function resetProgress() {
    setDone(false)
    setCreated(0)
    setUpdated(0)
    setSkipped(0)
    setProcessed(0)
    setFailures([])
    setProgressByRow({})
    setActiveRowNumber(undefined)
    setLastCompleted("")
  }

  function downloadTemplate() {
    const blob = new Blob([IMPORT_TEMPLATE_CSV], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "users.example.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importOneRow(row: ImportFileRow) {
    const fallback = {
      username: row.username || `Row ${row.rowNumber}`,
      status: "skipped" as const,
      profile: false,
      password: false,
      email: false,
    }
    try {
      const result = await withTimeout(importOneUserAction(row), ROW_TIMEOUT_MS)
      if (!result.ok) {
        return { ...fallback, reason: result.error }
      }
      const { ok: _ok, ...item } = result
      return item
    } catch (error) {
      return {
        ...fallback,
        reason: error instanceof Error ? error.message : "Import failed",
      }
    }
  }

  async function startImport() {
    if (blocked || !canManage || summary.ready === 0) return
    cancelledRef.current = false
    setRunning(true)
    resetProgress()
    const flaggedProgress: Record<number, ImportRowProgress> = {}
    const flaggedFailures = summary.flagged.map((item) => {
      flaggedProgress[item.rowNumber] = {
        status: "failed",
        reason: item.reason,
      }
      return {
        username: `Row ${item.rowNumber}`,
        reason: item.label.startsWith("Row ")
          ? item.reason
          : `${item.label}: ${item.reason}`,
      }
    })
    setProgressByRow(flaggedProgress)
    setFailures(flaggedFailures)
    setSkipped(flaggedFailures.length)
    try {
      for (const row of summary.rows) {
        if (cancelledRef.current) break
        setActiveRowNumber(row.rowNumber)
        setProgressByRow((current) => ({
          ...current,
          [row.rowNumber]: { status: "importing" },
        }))
        const result = await importOneRow(row)
        const failed = result.status === "skipped"
        setProgressByRow((current) => ({
          ...current,
          [row.rowNumber]: {
            status: failed ? "failed" : "done",
            profile: result.profile,
            password: result.password,
            email: result.email,
            reason: result.reason,
          },
        }))
        if (failed) {
          setSkipped((value) => value + 1)
          setFailures((value) => [
            ...value,
            { username: result.username, reason: result.reason },
          ])
        } else if (result.status === "created") {
          setCreated((value) => value + 1)
        } else {
          setUpdated((value) => value + 1)
        }
        setProcessed((value) => value + 1)
        const steps = [
          result.profile ? "profile" : null,
          result.password ? "password" : null,
          result.email ? "email" : null,
        ].filter(Boolean)
        setLastCompleted(
          failed
            ? `${result.username} failed`
            : `${result.username} · ${steps.join(" · ")}`,
        )
      }
      setActiveRowNumber(undefined)
      setDone(true)
    } catch (error) {
      setParseError(
        error instanceof Error ? error.message : "Import failed.",
      )
    } finally {
      setRunning(false)
      try {
        await finishImportAction()
      } catch {
        // Users list will refresh on the next visit.
      }
    }
  }

  return (
    <Frame spacing="default" className="w-full min-w-0 overflow-hidden">
      <FrameHeader className="flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <FrameTitle>Import self-help users</FrameTitle>
          <FrameDescription>
            Import into workspace <span className="font-medium text-foreground">{realm}</span>.
            CSV, Excel (.xlsx), or JSON. Columns: phone, email, clientId, externalId, firstName,
            lastName.
          </FrameDescription>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href="/admin/users" />}>
          <UsersIcon aria-hidden="true" />
          Self Help Users
        </Button>
      </FrameHeader>
      <FramePanel className="min-w-0 space-y-4">
        {blocked ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Master is blocked</AlertTitle>
            <AlertDescription>
              Switch the workspace to a SACCO realm before importing members.
            </AlertDescription>
          </Alert>
        ) : null}

        {realm === "app" && !blocked ? (
          <Alert variant="warning">
            <CircleAlertIcon />
            <AlertTitle>Template realm</AlertTitle>
            <AlertDescription>
              app is the template. Live members belong in the SACCO realm, not here.
            </AlertDescription>
          </Alert>
        ) : null}

        <div
          className={cn(
            "rounded-lg relative border border-dashed p-8 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input {...getInputProps()} className="sr-only" />
          <div className="flex flex-col items-center gap-3">
            <div className="bg-muted flex size-14 items-center justify-center rounded-full">
              <UploadIcon className="text-muted-foreground size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Drop a CSV, Excel, or JSON file</p>
              <p className="text-muted-foreground text-xs">
                phone,email,clientId,externalId,firstName,lastName — up to{" "}
                {formatBytes(5 * 1024 * 1024)}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button type="button" onClick={openFileDialog} disabled={running}>
                <UploadIcon className="size-4" />
                Choose file
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={running}
                onClick={downloadTemplate}
              >
                Download template
              </Button>
            </div>
          </div>
        </div>

        {running || done ? (
          <Progress value={progress}>
            <ProgressLabel>
              {done
                ? "Import finished"
                : `Importing ${processed} / ${summary.ready}${lastCompleted ? ` · ${lastCompleted}` : ""}`}
            </ProgressLabel>
            <ProgressValue />
          </Progress>
        ) : null}

        {done || processed > 0 ? (
          <div className="flex flex-wrap gap-2">
            <Badge size="sm" variant="success-light">
              Created: {created}
            </Badge>
            <Badge size="sm" variant="secondary">
              Updated: {updated}
            </Badge>
            <Badge size="sm" variant="destructive">
              Skipped: {skipped}
            </Badge>
          </div>
        ) : null}

        {files[0] ? (
          <div className="border-border bg-card flex items-center gap-3 rounded-lg border p-3">
            <div className="border-border text-muted-foreground flex size-10 items-center justify-center rounded-lg border">
              <FileSpreadsheetIcon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {files[0].file instanceof File
                  ? files[0].file.name
                  : files[0].file.name}
              </p>
              <p className="text-muted-foreground text-xs">
                {files[0].file instanceof File
                  ? formatBytes(files[0].file.size)
                  : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={running}
              onClick={() => {
                clearFiles()
                setRows([])
                setParseError("")
                resetProgress()
              }}
            >
              Clear
            </Button>
          </div>
        ) : null}

        {summary.total > 0 ? (
          <ImportReviewGrid
            rows={rows}
            ready={summary.ready}
            flagged={summary.flagged.length}
            progressByRow={progressByRow}
            activeRowNumber={activeRowNumber}
            actions={
              <>
                <Button
                  type="button"
                  disabled={blocked || !canManage || running || summary.ready === 0}
                  aria-busy={running}
                  onClick={startImport}
                >
                  <PendingSubmitContent pending={running} pendingLabel="Importing…">
                    {`Proceed with ${summary.ready} ready ${summary.ready === 1 ? "user" : "users"}`}
                  </PendingSubmitContent>
                </Button>
                {running ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      cancelledRef.current = true
                    }}
                  >
                    Stop after this user
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      clearFiles()
                      setRows([])
                      setParseError("")
                      resetProgress()
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </>
            }
          />
        ) : null}

        {failures.length > 0 ? (
          <Alert variant={created + updated > 0 ? "warning" : "destructive"}>
            <CircleAlertIcon />
            <AlertTitle>
              {created + updated > 0
                ? "Some rows were flagged"
                : "No rows could be imported"}
            </AlertTitle>
            <AlertDescription>
              {failures.slice(0, 8).map((item) => (
                <p key={`${item.username}-${item.reason}`}>
                  {item.username || "(empty)"}: {item.reason}
                </p>
              ))}
              {failures.length > 8 ? (
                <p>and {failures.length - 8} more</p>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        {parseError || errors.length > 0 ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Could not import</AlertTitle>
            <AlertDescription>
              {parseError ? <p>{parseError}</p> : null}
              {errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </AlertDescription>
          </Alert>
        ) : null}
      </FramePanel>
    </Frame>
  )
}
