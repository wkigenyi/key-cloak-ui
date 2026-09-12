"use client"

import { useMemo, useState } from "react"
import { CircleAlertIcon, FileSpreadsheetIcon, UploadIcon } from "lucide-react"
import { importUsersChunkAction } from "@/app/admin/import/actions"
import {
  parseImportFile,
  summarizeImportRows,
  type ImportFileRow,
} from "@/lib/import/user-file"
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
import { PendingSubmitContent } from "@/components/admin/form-submit-button"
import { Button } from "@/components/ui/button"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import { cn } from "@/lib/utils"

const CHUNK_SIZE = 25

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
    accept: ".csv,.json,text/csv,application/json",
    multiple: false,
    onFilesChange: async (next) => {
      const file = next[0]?.file
      if (!(file instanceof File)) {
        setRows([])
        setParseError("")
        resetProgress()
        return
      }
      try {
        const text = await file.text()
        const parsed = parseImportFile(text, file.name)
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
  }

  async function startImport() {
    if (blocked || !canManage || summary.ready === 0) return
    setRunning(true)
    resetProgress()
    try {
      for (let index = 0; index < summary.rows.length; index += CHUNK_SIZE) {
        const chunk = summary.rows.slice(index, index + CHUNK_SIZE)
        const result = await importUsersChunkAction(chunk)
        setCreated((value) => value + result.created)
        setUpdated((value) => value + result.updated)
        setSkipped((value) => value + result.skipped)
        setProcessed((value) => value + chunk.length)
        setFailures((value) => [...value, ...result.failures])
      }
      setDone(true)
    } catch (error) {
      setParseError(
        error instanceof Error ? error.message : "Import failed.",
      )
    } finally {
      setRunning(false)
    }
  }

  return (
    <Frame spacing="default" className="w-full">
      <FrameHeader>
        <FrameTitle>Import self-help users</FrameTitle>
        <FrameDescription>
          Import into workspace <span className="font-medium text-foreground">{realm}</span>.
          CSV or JSON. Required columns: username (or phone), clientId. Password is
          optional — missing passwords get UPDATE_PASSWORD.
        </FrameDescription>
      </FrameHeader>
      <FramePanel className="space-y-4">
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
              <p className="text-sm font-medium">Drop a CSV or JSON file</p>
              <p className="text-muted-foreground text-xs">
                username,clientId,password,email,firstName,lastName — up to{" "}
                {formatBytes(5 * 1024 * 1024)}
              </p>
            </div>
            <Button type="button" onClick={openFileDialog} disabled={running}>
              <UploadIcon className="size-4" />
              Choose file
            </Button>
          </div>
        </div>

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
          <div className="flex flex-wrap gap-2">
            <Badge size="sm" variant="secondary">
              Ready: {summary.ready}
            </Badge>
            <Badge size="sm" variant="success-light">
              With password: {summary.withPassword}
            </Badge>
            <Badge size="sm" variant="warning-light">
              Reset on login: {summary.withoutPassword}
            </Badge>
            {summary.skipped > 0 ? (
              <Badge size="sm" variant="destructive">
                Missing clientId/username: {summary.skipped}
              </Badge>
            ) : null}
          </div>
        ) : null}

        {running || done ? (
          <Progress value={progress}>
            <ProgressLabel>
              {done ? "Import finished" : "Importing"}
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

        {failures.length > 0 ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Some rows were skipped</AlertTitle>
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

        <div className="flex items-center gap-2">
          <Button
            type="button"
            disabled={blocked || !canManage || running || summary.ready === 0}
            aria-busy={running}
            onClick={startImport}
          >
            <PendingSubmitContent pending={running} pendingLabel="Importing…">
              Import {summary.ready || ""} {summary.ready === 1 ? "user" : "users"}
            </PendingSubmitContent>
          </Button>
          <p className="text-muted-foreground text-xs">
            The file stays in this browser. Passwords are not stored on the realm.
          </p>
        </div>
      </FramePanel>
    </Frame>
  )
}
