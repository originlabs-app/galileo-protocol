"use client";

import { useCallback, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  LoaderCircle,
  Upload,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { API_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ImportRowIssue {
  field: string;
  message: string;
}

interface RowError extends ImportRowIssue {
  row: number;
}

interface ImportRowInput {
  name: string;
  gtin: string;
  serialNumber: string;
  category: string;
  description?: string;
}

interface ImportRowResult {
  row: number;
  status: "accepted" | "rejected";
  input: ImportRowInput | null;
  errors: ImportRowIssue[];
}

interface ImportSummary {
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
}

interface ImportResult {
  dryRun: boolean;
  created: number;
  errors: RowError[];
  rows: ImportRowResult[];
  summary: ImportSummary;
}

interface ImportResponse {
  success: boolean;
  data?: ImportResult;
  error?: {
    message?: string;
    details?: {
      errors?: RowError[];
    };
  };
}

type ImportStage =
  | "idle"
  | "preview"
  | "validating"
  | "review"
  | "committing"
  | "complete";

type CsvPreviewResult =
  | { ok: true; rows: string[][] }
  | { ok: false; message: string };

function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }

  return text;
}

function parseCsvRecords(content: string): CsvPreviewResult {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  const text = stripBom(content);

  function pushField() {
    currentRow.push(currentField.trim());
    currentField = "";
  }

  function pushRow() {
    const isEmptyRow = currentRow.every((field) => field === "");
    if (!isEmptyRow) {
      rows.push(currentRow);
    }
    currentRow = [];
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          currentField += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      pushField();
      continue;
    }

    if (char === "\n") {
      pushField();
      pushRow();
      continue;
    }

    if (char === "\r") {
      if (text[index + 1] === "\n") {
        index += 1;
      }
      pushField();
      pushRow();
      continue;
    }

    currentField += char;
  }

  if (inQuotes) {
    return { ok: false, message: "Malformed CSV: unterminated quoted field" };
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    pushField();
    pushRow();
  }

  return { ok: true, rows };
}

function parseCsvPreview(content: string): CsvPreviewResult {
  const parsed = parseCsvRecords(content);
  if (!parsed.ok) {
    return parsed;
  }

  return {
    ok: true,
    rows: parsed.rows.slice(0, 6),
  };
}

interface BatchImportDialogProps {
  onImportComplete?: () => void;
}

export function BatchImportDialog({
  onImportComplete,
}: BatchImportDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<ImportStage>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function reset() {
    setStage("idle");
    setFile(null);
    setPreview([]);
    setResult(null);
    setErrorMessage(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      reset();
    }
  }

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = event.target.files?.[0];
      if (!selected) {
        return;
      }

      if (!selected.name.endsWith(".csv")) {
        setErrorMessage("Please select a .csv file");
        setStage("idle");
        return;
      }

      setFile(selected);
      setResult(null);
      setErrorMessage(null);

      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        if (!content.trim()) {
          setErrorMessage("File is empty");
          setPreview([]);
          setStage("idle");
          return;
        }

        const parsedPreview = parseCsvPreview(content);
        if (!parsedPreview.ok) {
          setErrorMessage(parsedPreview.message);
          setPreview([]);
          setStage("idle");
          return;
        }

        setPreview(parsedPreview.rows);
        setStage("preview");
      };
      reader.readAsText(selected);

      event.target.value = "";
    },
    [],
  );

  const submitImport = useCallback(async (dryRun: boolean) => {
    if (!file) {
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);

    const params = new URLSearchParams();
    if (!dryRun) {
      params.set("dryRun", "false");
    }

    const effectiveBrandId = user?.brandId ?? user?.brand?.id;
    if (effectiveBrandId) {
      params.set("brandId", effectiveBrandId);
    }

    const query = params.size > 0 ? `?${params.toString()}` : "";
    const response = await fetch(`${API_URL}/products/batch-import${query}`, {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: {
        "X-Galileo-Client": "dashboard",
      },
    });

    const payload = (await response.json()) as ImportResponse;
    if (!response.ok || !payload.success || !payload.data) {
      const detailErrors =
        payload.error?.details?.errors ?? payload.data?.errors ?? [];

      return {
        ok: false as const,
        message: payload.error?.message ?? "Import failed",
        data: payload.data
          ? {
              ...payload.data,
              errors: detailErrors,
            }
          : null,
      };
    }

    return {
      ok: true as const,
      data: payload.data,
    };
  }, [file, user?.brand?.id, user?.brandId]);

  const handleValidate = useCallback(async () => {
    if (!file) {
      return;
    }

    setStage("validating");
    setErrorMessage(null);

    try {
      const response = await submitImport(true);
      if (!response) {
        setStage("preview");
        return;
      }

      if (!response.ok) {
        setResult(response.data);
        setErrorMessage(response.message);
        setStage(response.data ? "review" : "preview");
        return;
      }

      setResult(response.data);
      setStage("review");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not validate the import",
      );
      setStage("preview");
    }
  }, [file, submitImport]);

  const handleCommit = useCallback(async () => {
    if (!file) {
      return;
    }

    setStage("committing");
    setErrorMessage(null);

    try {
      const response = await submitImport(false);
      if (!response) {
        setStage("review");
        return;
      }

      if (!response.ok) {
        setResult(response.data);
        setErrorMessage(response.message);
        setStage(response.data ? "review" : "preview");
        return;
      }

      setResult(response.data);
      setStage("complete");
      onImportComplete?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not commit the import",
      );
      setStage("review");
    }
  }, [file, onImportComplete, submitImport]);

  const acceptedRows =
    result?.rows.filter(
      (row): row is ImportRowResult & { input: ImportRowInput } =>
        row.status === "accepted" && row.input !== null,
    ) ?? [];
  const rejectedRows = result?.errors ?? [];
  const hasBlockingErrors = (result?.summary.rejectedRows ?? 0) > 0;
  const canCommit =
    stage === "review" &&
    !!result &&
    result.summary.acceptedRows > 0 &&
    !hasBlockingErrors;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp className="mr-1 size-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Products from CSV</DialogTitle>
          <DialogDescription>
            Upload a catalog CSV, review the server validation result, and only
            commit when every row is accepted.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {stage === "idle" ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8">
              <Upload className="size-8 text-muted-foreground" />
              <p className="text-center text-sm text-muted-foreground">
                Select a CSV file with `name`, `gtin`, `serialNumber`,
                `category`, `description`, and `materials` columns.
              </p>
              <Button variant="outline" size="sm" asChild>
                <label className="cursor-pointer">
                  Choose CSV file
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              </Button>
              {errorMessage ? (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="size-4" />
                  {errorMessage}
                </div>
              ) : null}
            </div>
          ) : null}

          {stage === "preview" && preview.length > 0 ? (
            <>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium text-foreground">
                  {file?.name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This preview is local only. Run server validation before any
                  products are created. Quoted multiline cells use the same CSV
                  framing rules as the server.
                </p>
              </div>
              <div className="max-h-64 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {preview[0]?.map((header, index) => (
                        <TableHead key={index}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(1).map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex} className="text-xs">
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={reset}>
                  Choose another file
                </Button>
                <Button onClick={handleValidate}>Validate import</Button>
              </div>
            </>
          ) : null}

          {stage === "validating" || stage === "committing" ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <LoaderCircle className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {stage === "validating"
                  ? "Running server validation..."
                  : "Committing accepted rows..."}
              </p>
            </div>
          ) : null}

          {stage === "review" && result ? (
            <div className="flex flex-col gap-4">
              <div
                className={`rounded-lg border px-4 py-4 ${
                  hasBlockingErrors
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-emerald-500/30 bg-emerald-500/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  {hasBlockingErrors ? (
                    <AlertCircle className="mt-0.5 size-5 text-destructive" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {hasBlockingErrors
                        ? "Validation blocked this import"
                        : "Validation passed. Ready to commit."}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {hasBlockingErrors
                        ? "Fix the rejected rows and re-run the import. No products have been created."
                        : "Every row passed server validation. Commit when you are ready to add them to the workspace."}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-md border bg-background px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Total rows
                    </p>
                    <p className="mt-1 font-semibold text-foreground">
                      {result.summary.totalRows}
                    </p>
                  </div>
                  <div className="rounded-md border bg-background px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Accepted
                    </p>
                    <p className="mt-1 font-semibold text-foreground">
                      {result.summary.acceptedRows}
                    </p>
                  </div>
                  <div className="rounded-md border bg-background px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Rejected
                    </p>
                    <p className="mt-1 font-semibold text-foreground">
                      {result.summary.rejectedRows}
                    </p>
                  </div>
                </div>
              </div>

              {errorMessage ? (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="size-4" />
                  {errorMessage}
                </div>
              ) : null}

              {acceptedRows.length > 0 ? (
                <>
                  <p className="text-sm font-medium text-foreground">
                    Accepted rows ready for commit
                  </p>
                  <div className="max-h-48 overflow-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>GTIN</TableHead>
                          <TableHead>Serial</TableHead>
                          <TableHead>Category</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {acceptedRows.slice(0, 5).map((row) => (
                          <TableRow key={row.row}>
                            <TableCell>{row.row}</TableCell>
                            <TableCell className="font-medium">
                              {row.input.name}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {row.input.gtin}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {row.input.serialNumber}
                            </TableCell>
                            <TableCell>{row.input.category}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : null}

              {rejectedRows.length > 0 ? (
                <>
                  <p className="text-sm font-medium text-destructive">
                    Row-level validation issues
                  </p>
                  <div className="max-h-48 overflow-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Field</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rejectedRows.map((error, index) => (
                          <TableRow
                            key={`${error.row}-${error.field}-${index}`}
                          >
                            <TableCell>{error.row}</TableCell>
                            <TableCell>{error.field}</TableCell>
                            <TableCell className="text-xs text-destructive">
                              {error.message}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={reset}>
                  Choose another file
                </Button>
                <Button onClick={handleCommit} disabled={!canCommit}>
                  Commit import
                </Button>
              </div>
            </div>
          ) : null}

          {stage === "complete" && result ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {result.created} product
                      {result.created !== 1 ? "s" : ""} created successfully
                    </p>
                    <p className="text-sm text-muted-foreground">
                      The products workspace has been refreshed with the committed import.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md border bg-background px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Imported
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {result.created}
                  </p>
                </div>
                <div className="rounded-md border bg-background px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Accepted
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {result.summary.acceptedRows}
                  </p>
                </div>
                <div className="rounded-md border bg-background px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Rejected
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {result.summary.rejectedRows}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleOpenChange(false)}>Done</Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
