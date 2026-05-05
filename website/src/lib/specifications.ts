import { promises as fs } from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface SpecMetadata {
  title: string;
  status: 'Draft' | 'Active' | 'Standard';
  version: string;
  lastUpdated: string;
  specId?: string;
}

export interface SpecFile {
  slug: string;
  filename: string;
  category: string;
  subcategory?: string;
  type: 'markdown' | 'json' | 'jsonld';
  title: string;
  status: 'Draft' | 'Active' | 'Standard';
  version: string;
  lastUpdated: string;
  specId?: string;
}

export interface SpecContent {
  type: 'markdown' | 'json' | 'jsonld';
  content: string;
  metadata: SpecMetadata;
}

// ============================================================================
// Constants
// ============================================================================

const SPECS_ROOT = path.join(process.cwd(), '../specifications');

// Categories to exclude (contain code, not documentation)
const EXCLUDED_CATEGORIES = ['contracts'];

// File extensions we support
const SUPPORTED_EXTENSIONS = ['.md', '.json', '.jsonld'];

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get all specification categories from the specifications directory.
 * Excludes categories that don't contain documentation (e.g., contracts with .sol files).
 */
export async function getSpecCategories(): Promise<string[]> {
  const entries = await fs.readdir(SPECS_ROOT, { withFileTypes: true });

  const categories = entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => !EXCLUDED_CATEGORIES.includes(name))
    .sort();

  return categories;
}

/**
 * Get all specifications in a category, including those in subdirectories.
 * Handles nested folder structures like schemas/dpp/, compliance/guides/, etc.
 */
export async function getSpecifications(category: string): Promise<SpecFile[]> {
  const categoryPath = path.join(SPECS_ROOT, category);
  const specs: SpecFile[] = [];

  await collectSpecs(categoryPath, category, undefined, specs);

  // Sort alphabetically by title within category
  return specs.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Recursively collect specification files from a directory.
 */
async function collectSpecs(
  dirPath: string,
  category: string,
  subcategory: string | undefined,
  specs: SpecFile[]
): Promise<void> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Recurse into subdirectory
      await collectSpecs(fullPath, category, entry.name, specs);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();

      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        const content = await fs.readFile(fullPath, 'utf8');
        const metadata = parseFileMetadata(content, entry.name);
        const type = getFileType(entry.name);

        specs.push({
          slug: entry.name.replace(/\.(md|json|jsonld)$/i, ''),
          filename: entry.name,
          category,
          subcategory,
          type,
          title: metadata.title,
          status: metadata.status,
          version: metadata.version,
          lastUpdated: metadata.lastUpdated,
          specId: metadata.specId,
        });
      }
    }
  }
}

/**
 * Get a single specification by category and slug.
 * Searches in the category root and all subdirectories.
 */
export async function getSpecification(
  category: string,
  slug: string,
  subcategory?: string
): Promise<SpecContent | null> {
  const basePath = subcategory
    ? path.join(SPECS_ROOT, category, subcategory)
    : path.join(SPECS_ROOT, category);

  // Try each supported extension
  for (const ext of SUPPORTED_EXTENSIONS) {
    const filePath = path.join(basePath, `${slug}${ext}`);

    try {
      const content = await fs.readFile(filePath, 'utf8');
      const metadata = parseFileMetadata(content, `${slug}${ext}`);
      const type = getFileType(`${slug}${ext}`);

      return {
        type,
        content,
        metadata,
      };
    } catch {
      // File doesn't exist with this extension, try next
      continue;
    }
  }

  // If not found in root, search subdirectories (for category pages without subcategory)
  if (!subcategory) {
    const categoryPath = path.join(SPECS_ROOT, category);
    const entries = await fs.readdir(categoryPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const result = await getSpecification(category, slug, entry.name);
        if (result) return result;
      }
    }
  }

  return null;
}

// ============================================================================
// Metadata Parsing
// ============================================================================

/**
 * Parse metadata from file content based on file type.
 */
function parseFileMetadata(content: string, filename: string): SpecMetadata {
  const ext = path.extname(filename).toLowerCase();

  if (ext === '.md') {
    return parseMarkdownMetadata(content);
  } else if (ext === '.json' || ext === '.jsonld') {
    return parseJSONMetadata(content, filename);
  }

  return getDefaultMetadata(filename);
}

/**
 * Parse metadata from bold markdown headers.
 * Galileo specs use **Status:**, **Version:**, etc. instead of YAML frontmatter.
 */
export function parseMarkdownMetadata(content: string): SpecMetadata {
  const lines = content.split('\n').slice(0, 20);

  // Extract title from first # heading
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled Specification';

  // Extract metadata from bold markdown headers
  const status = extractBoldValue(lines, 'Status') as 'Draft' | 'Active' | 'Standard' || 'Draft';
  const version = extractBoldValue(lines, 'Version') || '1.0.0';
  const lastUpdated = extractBoldValue(lines, 'Last Updated') || '';

  // Try multiple spec ID formats
  const specId =
    extractBoldValue(lines, 'Specification Series') ||
    extractBoldValue(lines, 'Specification ID') ||
    extractBoldValue(lines, 'Specification') ||
    extractBoldValue(lines, 'Requirement');

  return {
    title,
    status: normalizeStatus(status),
    version,
    lastUpdated,
    specId: specId || undefined,
  };
}

/**
 * Extract value from a bold markdown header line like "**Key:** Value".
 */
function extractBoldValue(lines: string[], key: string): string | undefined {
  const regex = new RegExp(`\\*\\*${key}:\\*\\*\\s*(.+)`, 'i');

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Parse metadata from JSON/JSONLD schema files.
 */
function parseJSONMetadata(content: string, filename: string): SpecMetadata {
  try {
    const json = JSON.parse(content);

    // For JSON Schema files
    const title = json.title ||
                  json.name ||
                  formatFilenameAsTitle(filename);

    // Extract version from $id or use default
    const versionMatch = json.$id?.match(/\/v(\d+\.\d+\.\d+)\//);
    const version = versionMatch ? versionMatch[1] : '1.0.0';

    return {
      title,
      status: 'Standard', // JSON schemas are typically stable
      version,
      lastUpdated: '',
      specId: json.$id,
    };
  } catch {
    return getDefaultMetadata(filename);
  }
}

/**
 * Get default metadata when parsing fails.
 */
function getDefaultMetadata(filename: string): SpecMetadata {
  return {
    title: formatFilenameAsTitle(filename),
    status: 'Draft',
    version: '1.0.0',
    lastUpdated: '',
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Determine file type from filename extension.
 */
function getFileType(filename: string): 'markdown' | 'json' | 'jsonld' {
  const ext = path.extname(filename).toLowerCase();

  if (ext === '.jsonld') return 'jsonld';
  if (ext === '.json') return 'json';
  return 'markdown';
}

/**
 * Normalize status string to valid enum value.
 */
function normalizeStatus(status: string): 'Draft' | 'Active' | 'Standard' {
  const normalized = status.toLowerCase();

  if (normalized === 'active') return 'Active';
  if (normalized === 'standard' || normalized === 'stable') return 'Standard';
  return 'Draft';
}

/**
 * Format a filename as a human-readable title.
 * e.g., "dpp-core.schema.json" -> "DPP Core Schema"
 */
function formatFilenameAsTitle(filename: string): string {
  return filename
    .replace(/\.(md|json|jsonld|schema\.json)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/Dpp/g, 'DPP')
    .replace(/Gs1/g, 'GS1')
    .replace(/Vc/g, 'VC')
    .replace(/Did/g, 'DID')
    .replace(/Kyc/g, 'KYC')
    .replace(/Aml/g, 'AML')
    .replace(/Rbac/g, 'RBAC')
    .replace(/Espr/g, 'ESPR')
    .replace(/Gdpr/g, 'GDPR')
    .replace(/Mica/g, 'MiCA')
    .replace(/Cbv/g, 'CBV')
    .trim();
}

/**
 * Capitalize a category name.
 * e.g., "identity" -> "Identity", "infrastructure" -> "Infrastructure"
 */
export function capitalizeCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Get spec count for a category (including subdirectories).
 */
export async function getSpecCount(category: string): Promise<number> {
  const specs = await getSpecifications(category);
  return specs.length;
}
