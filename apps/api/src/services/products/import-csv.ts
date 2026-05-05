import {
  productMaterialsSchema,
  type ProductMaterial,
} from "@galileo/shared";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { isPrismaUniqueViolation } from "../../utils/prisma-errors.js";
import {
  catalogAuthoringDraftSchema,
  createCatalogProductDraft,
  type CatalogAuthoringDraftInput,
} from "./catalog-authoring.js";

const HEADER_ALIASES = {
  name: "name",
  gtin: "gtin",
  serialnumber: "serialNumber",
  category: "category",
  description: "description",
  materials: "materials",
} as const;

const REQUIRED_COLUMNS = ["name", "gtin", "serialNumber", "category"] as const;

type CsvImportColumn = (typeof HEADER_ALIASES)[keyof typeof HEADER_ALIASES];
type CsvImportDbClient = Pick<PrismaClient, "product" | "$transaction">;
type CsvImportPreviewDbClient = Pick<PrismaClient, "product">;

interface CsvImportSourceRow {
  name: string;
  gtin: string;
  serialNumber: string;
  category: string;
  description: string;
  materials: string;
}

interface CsvImportRowIssue {
  field: string;
  message: string;
}

export interface CatalogImportRowError extends CsvImportRowIssue {
  row: number;
}

export interface CatalogImportRowResult {
  row: number;
  status: "accepted" | "rejected";
  input: CatalogAuthoringDraftInput | null;
  errors: CsvImportRowIssue[];
}

export interface CatalogImportSummary {
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
}

export interface CatalogImportPreview {
  ok: true;
  summary: CatalogImportSummary;
  rows: CatalogImportRowResult[];
  errors: CatalogImportRowError[];
}

export interface CatalogImportFileError {
  ok: false;
  message: string;
}

export interface CatalogImportCommitResult extends CatalogImportPreview {
  created: number;
}

interface PreflightCatalogCsvImportParams {
  brandId: string;
  content: string;
  maxRows: number;
  prisma: CsvImportPreviewDbClient;
}

interface CommitCatalogCsvImportParams {
  brandId: string;
  content: string;
  maxRows: number;
  performedBy: string;
  prisma: CsvImportDbClient;
}

type PartialCatalogCsvImportParams = CommitCatalogCsvImportParams;

type CatalogImportResult = CatalogImportPreview | CatalogImportFileError;

type ParsedCsvRecords =
  | { ok: true; rows: string[][] }
  | { ok: false; message: string };

type ParsedCsvSource =
  | { ok: true; rows: CsvImportSourceRow[] }
  | { ok: false; message: string };

function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

function normalizeHeader(value: string): CsvImportColumn | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  return HEADER_ALIASES[normalized as keyof typeof HEADER_ALIASES] ?? null;
}

function buildEmptySourceRow(): CsvImportSourceRow {
  return {
    name: "",
    gtin: "",
    serialNumber: "",
    category: "",
    description: "",
    materials: "",
  };
}

function parseCsvRecords(content: string): ParsedCsvRecords {
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

  for (let index = 0; index < text.length; index++) {
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

function hasInvalidEncoding(content: string): boolean {
  // buffer.toString('utf-8') replaces undecodable bytes with U+FFFD;
  // null bytes (U+0000) are also never valid in CSV text files.
  return content.includes("\uFFFD") || content.includes("\x00");
}

function parseCsvSource(content: string): ParsedCsvSource {
  if (hasInvalidEncoding(content)) {
    return {
      ok: false,
      message: "File must be valid UTF-8 encoded text (invalid bytes detected)",
    };
  }

  const parsedRecords = parseCsvRecords(content);
  if (!parsedRecords.ok) {
    return parsedRecords;
  }

  if (parsedRecords.rows.length === 0) {
    return { ok: true, rows: [] };
  }

  const [headerRow, ...dataRows] = parsedRecords.rows;
  const columns = headerRow!.map(normalizeHeader);

  for (const requiredColumn of REQUIRED_COLUMNS) {
    if (!columns.includes(requiredColumn)) {
      return {
        ok: false,
        message: `Missing required column: ${requiredColumn}`,
      };
    }
  }

  const rows = dataRows.map((record) => {
    const sourceRow = buildEmptySourceRow();

    for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
      const column = columns[columnIndex];
      if (!column) {
        continue;
      }

      sourceRow[column] = record[columnIndex] ?? "";
    }

    return sourceRow;
  });

  return { ok: true, rows };
}

function parseMaterialsCell(value: string): ProductMaterial[] | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  if (trimmed.startsWith("[")) {
    return productMaterialsSchema.parse(JSON.parse(trimmed));
  }

  const segments = trimmed
    .split("|")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    return undefined;
  }

  if (segments.length === 1 && !segments[0]!.includes(":")) {
    return productMaterialsSchema.parse([
      {
        name: segments[0]!,
        percentage: 100,
      },
    ]);
  }

  return productMaterialsSchema.parse(
    segments.map((segment) => {
      const [name, percentage] = segment.split(":").map((part) => part.trim());

      if (!name || !percentage) {
        throw new Error(
          'Materials must use "name:percentage|name:percentage" format for multiple entries',
        );
      }

      return {
        name,
        percentage: Number(percentage),
      };
    }),
  );
}

function normalizeCsvImportRow(
  source: CsvImportSourceRow,
): CatalogImportRowResult["input"] | CsvImportRowIssue[] {
  let materials: ProductMaterial[] | undefined;

  try {
    materials = parseMaterialsCell(source.materials);
  } catch (error) {
    return [
      {
        field: "materials",
        message:
          error instanceof Error ? error.message : "Invalid materials value",
      },
    ];
  }

  const parsed = catalogAuthoringDraftSchema.safeParse({
    name: source.name.trim(),
    gtin: source.gtin.trim(),
    serialNumber: source.serialNumber.trim(),
    category: source.category.trim(),
    description: source.description.trim() || undefined,
    materials,
  });

  if (parsed.success) {
    return parsed.data;
  }

  return parsed.error.issues.map((issue) => ({
    field: issue.path.join(".") || "unknown",
    message: issue.message,
  }));
}

function flattenRowErrors(rows: CatalogImportRowResult[]): CatalogImportRowError[] {
  return rows.flatMap((row) =>
    row.errors.map((error) => ({
      row: row.row,
      field: error.field,
      message: error.message,
    })),
  );
}

function summarizeRows(rows: CatalogImportRowResult[]): CatalogImportSummary {
  const acceptedRows = rows.filter((row) => row.status === "accepted").length;
  return {
    totalRows: rows.length,
    acceptedRows,
    rejectedRows: rows.length - acceptedRows,
  };
}

function buildConflictMessage(): string {
  return "A product with this GTIN and serial number already exists";
}

function addRowIssue(
  row: CatalogImportRowResult,
  issue: CsvImportRowIssue,
): CatalogImportRowResult {
  if (
    row.errors.some(
      (existing) =>
        existing.field === issue.field && existing.message === issue.message,
    )
  ) {
    return row;
  }

  return {
    ...row,
    status: "rejected",
    errors: [...row.errors, issue],
  };
}

async function enrichRowsWithDuplicateChecks(
  rows: CatalogImportRowResult[],
  prisma: CsvImportPreviewDbClient,
): Promise<CatalogImportRowResult[]> {
  const seenIdentityRows = new Map<string, number>();
  let checkedRows = rows.map((row) => ({ ...row, errors: [...row.errors] }));

  checkedRows = checkedRows.map((row) => {
    if (!row.input) {
      return row;
    }

    const identityKey = `${row.input.gtin}:${row.input.serialNumber}`;
    const firstSeenRow = seenIdentityRows.get(identityKey);

    if (firstSeenRow !== undefined) {
      return addRowIssue(row, {
        field: "gtin",
        message: `Duplicate GTIN+serialNumber within CSV (first seen on row ${firstSeenRow})`,
      });
    }

    seenIdentityRows.set(identityKey, row.row);
    return row;
  });

  const acceptedRows = checkedRows.filter(
    (row) => row.status === "accepted" && row.input,
  );

  if (acceptedRows.length === 0) {
    return checkedRows;
  }

  const existingProducts = await prisma.product.findMany({
    where: {
      OR: acceptedRows.map((row) => ({
        gtin: row.input!.gtin,
        serialNumber: row.input!.serialNumber,
      })),
    },
    select: {
      gtin: true,
      serialNumber: true,
    },
  });

  const existingByIdentity = new Map(
    existingProducts.map((product) => [
      `${product.gtin}:${product.serialNumber}`,
      product,
    ]),
  );

  return checkedRows.map((row) => {
    if (!row.input || row.status !== "accepted") {
      return row;
    }

    const conflict = existingByIdentity.get(
      `${row.input.gtin}:${row.input.serialNumber}`,
    );

    if (!conflict) {
      return row;
    }

    return addRowIssue(row, {
      field: "gtin",
      message: buildConflictMessage(),
    });
  });
}

export async function preflightCatalogCsvImport(
  params: PreflightCatalogCsvImportParams,
): Promise<CatalogImportResult> {
  const parsedSource = parseCsvSource(params.content);
  if (!parsedSource.ok) {
    return parsedSource;
  }

  if (parsedSource.rows.length > params.maxRows) {
    return {
      ok: false,
      message: `CSV exceeds maximum of ${params.maxRows} rows`,
    };
  }

  const normalizedRows = parsedSource.rows.map((sourceRow, index) => {
    const rowNumber = index + 2;
    const normalized = normalizeCsvImportRow(sourceRow);

    if (Array.isArray(normalized)) {
      return {
        row: rowNumber,
        status: "rejected" as const,
        input: null,
        errors: normalized,
      };
    }

    return {
      row: rowNumber,
      status: "accepted" as const,
      input: normalized,
      errors: [],
    };
  });

  const rows = await enrichRowsWithDuplicateChecks(
    normalizedRows,
    params.prisma,
  );

  return {
    ok: true,
    summary: summarizeRows(rows),
    rows,
    errors: flattenRowErrors(rows),
  };
}

export async function commitCatalogCsvImport(
  params: CommitCatalogCsvImportParams,
): Promise<CatalogImportCommitResult | CatalogImportFileError> {
  const preview = await preflightCatalogCsvImport(params);

  if (!preview.ok) {
    return preview;
  }

  if (preview.errors.length > 0) {
    return {
      ...preview,
      created: 0,
    };
  }

  let created = 0;

  try {
    await params.prisma.$transaction(async (tx) => {
      for (const row of preview.rows) {
        if (!row.input || row.status !== "accepted") {
          continue;
        }

        await createCatalogProductDraft(tx, {
          brandId: params.brandId,
          performedBy: params.performedBy,
          input: row.input,
        });
        created += 1;
      }
    });
  } catch (error) {
    if (isPrismaUniqueViolation(error)) {
      const refreshedPreview = await preflightCatalogCsvImport(params);
      if (refreshedPreview.ok) {
        return {
          ...refreshedPreview,
          created: 0,
        };
      }
    }

    throw error;
  }

  return {
    ...preview,
    created,
  };
}

export async function partialCatalogCsvImport(
  params: PartialCatalogCsvImportParams,
): Promise<CatalogImportCommitResult | CatalogImportFileError> {
  const preview = await preflightCatalogCsvImport(params);

  if (!preview.ok) {
    return preview;
  }

  let created = 0;
  let rows = preview.rows.map((row) => ({ ...row, errors: [...row.errors] }));

  for (const row of rows) {
    if (!row.input || row.status !== "accepted") {
      continue;
    }

    try {
      await params.prisma.$transaction(async (tx) => {
        await createCatalogProductDraft(tx, {
          brandId: params.brandId,
          performedBy: params.performedBy,
          input: row.input!,
        });
      });
      created += 1;
    } catch (error) {
      if (isPrismaUniqueViolation(error)) {
        Object.assign(
          row,
          addRowIssue(row, {
            field: "gtin",
            message:
              "A product with this GTIN and serial number already exists",
          }),
        );
        continue;
      }

      throw error;
    }
  }

  rows = rows.map((row) => ({
    ...row,
    errors: [...row.errors],
  }));

  return {
    ok: true,
    created,
    rows,
    summary: summarizeRows(rows),
    errors: flattenRowErrors(rows),
  };
}
