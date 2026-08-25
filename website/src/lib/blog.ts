import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

/**
 * A single FAQ entry for structured data (FAQPage JSON-LD)
 */
export interface BlogFaqItem {
  question: string;
  answer: string;
}

/**
 * Blog post frontmatter and content types
 */
export interface BlogPostFrontmatter {
  title: string;
  date: string;
  /** ISO date of last modification, defaults to `date` */
  modified: string;
  excerpt: string;
  /** Meta/OG description, defaults to `excerpt` */
  description: string;
  author: string;
  tags: string[];
  coverImage?: string;
  /** Alt text for the cover image, only meaningful with coverImage */
  coverImageAlt?: string;
  faq: BlogFaqItem[];
  published?: boolean;
}

const KEBAB_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

const DESCRIPTION_MIN = 120;
const DESCRIPTION_MAX = 158;
// The title is rendered as the full SERP title (title.absolute, no layout
// template suffix), so it must fit the ≤60-char SERP budget on its own.
const TITLE_MAX = 60;

function blogError(filename: string, message: string): never {
  throw new Error(
    `Invalid blog frontmatter in content/blog/${filename}: ${message}`
  );
}

function requireString(
  data: Record<string, unknown>,
  field: string,
  filename: string
): string {
  const value = data[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    blogError(filename, `missing or empty required field "${field}"`);
  }
  return value;
}

function requireIsoDate(
  value: unknown,
  field: string,
  filename: string
): string {
  if (
    typeof value !== 'string' ||
    !ISO_DATE.test(value) ||
    Number.isNaN(Date.parse(value))
  ) {
    blogError(
      filename,
      `field "${field}" must be a quoted ISO date (YYYY-MM-DD), got ${JSON.stringify(value)}`
    );
  }
  return value;
}

/**
 * Validate raw gray-matter frontmatter and normalize it into
 * BlogPostFrontmatter. Throws (failing the build) on any invalid frontmatter;
 * defaults only apply to optional fields: `modified = date`,
 * `description = excerpt`, `faq = []`.
 */
function normalizeFrontmatter(
  data: Record<string, unknown>,
  filename: string
): BlogPostFrontmatter {
  const slug = filename.replace(/\.mdx?$/, '');
  if (!KEBAB_SLUG.test(slug)) {
    blogError(filename, `slug "${slug}" must be kebab-case`);
  }

  const title = requireString(data, 'title', filename);
  if (title.length > TITLE_MAX) {
    blogError(filename, `title is ${title.length} chars (max ${TITLE_MAX})`);
  }

  const date = requireIsoDate(data.date, 'date', filename);
  const modified =
    data.modified === undefined ||
    data.modified === null ||
    data.modified === ''
      ? date
      : requireIsoDate(data.modified, 'modified', filename);
  if (Date.parse(modified) < Date.parse(date)) {
    blogError(filename, `modified (${modified}) is before date (${date})`);
  }

  const excerpt = requireString(data, 'excerpt', filename);
  const description =
    typeof data.description === 'string' && data.description.trim().length > 0
      ? data.description
      : excerpt;
  if (
    description.length < DESCRIPTION_MIN ||
    description.length > DESCRIPTION_MAX
  ) {
    blogError(
      filename,
      `description must be ${DESCRIPTION_MIN}-${DESCRIPTION_MAX} chars, got ${description.length}`
    );
  }

  const author = requireString(data, 'author', filename);

  if (
    !Array.isArray(data.tags) ||
    !data.tags.every((tag) => typeof tag === 'string')
  ) {
    blogError(filename, 'field "tags" must be an array of strings');
  }
  const tags = data.tags as string[];

  if (typeof data.published !== 'boolean') {
    blogError(filename, 'missing required boolean field "published"');
  }

  let faq: BlogFaqItem[] = [];
  if (data.faq !== undefined && data.faq !== null) {
    if (!Array.isArray(data.faq)) {
      blogError(filename, 'field "faq" must be an array of {question, answer}');
    }
    faq = (data.faq as unknown[]).map((item, index) => {
      if (typeof item !== 'object' || item === null) {
        blogError(filename, `faq[${index}] must be an object`);
      }
      const { question, answer } = item as { question?: unknown; answer?: unknown };
      if (
        typeof question !== 'string' ||
        question.trim().length === 0 ||
        typeof answer !== 'string' ||
        answer.trim().length === 0
      ) {
        blogError(
          filename,
          `faq[${index}] needs a non-empty question and answer`
        );
      }
      return { question, answer };
    });
  }

  return {
    title,
    date,
    modified,
    excerpt,
    description,
    author,
    tags,
    coverImage: data.coverImage as string | undefined,
    coverImageAlt: data.coverImageAlt as string | undefined,
    faq,
    published: data.published,
  };
}

export interface BlogPost {
  slug: string;
  frontmatter: BlogPostFrontmatter;
  content: string;
}

export interface BlogPostMeta {
  slug: string;
  frontmatter: BlogPostFrontmatter;
}

/**
 * Directory containing blog posts
 */
const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

/**
 * Get all blog posts with frontmatter and content
 * Posts are sorted by date (newest first)
 * Unpublished posts are excluded in production
 */
export function getAllPosts(): BlogPostMeta[] {
  // Ensure directory exists
  if (!fs.existsSync(BLOG_DIR)) {
    return [];
  }

  const files = fs.readdirSync(BLOG_DIR);
  const mdxFiles = files.filter(
    (file) => file.endsWith('.mdx') || file.endsWith('.md')
  );

  const posts = mdxFiles
    .map((filename) => {
      const slug = filename.replace(/\.mdx?$/, '');
      const filePath = path.join(BLOG_DIR, filename);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data } = matter(fileContent);

      const frontmatter = normalizeFrontmatter(data, filename);

      return {
        slug,
        frontmatter,
      };
    })
    // Filter out unpublished posts in production
    .filter((post) => {
      if (process.env.NODE_ENV === 'production') {
        return post.frontmatter.published !== false;
      }
      return true;
    })
    // Sort by date (newest first)
    .sort((a, b) => {
      const dateA = new Date(a.frontmatter.date).getTime();
      const dateB = new Date(b.frontmatter.date).getTime();
      return dateB - dateA;
    });

  return posts;
}

/**
 * Get a single blog post by slug
 * Returns null if post doesn't exist
 */
export function getPostBySlug(slug: string): BlogPost | null {
  const mdxPath = path.join(BLOG_DIR, `${slug}.mdx`);
  const mdPath = path.join(BLOG_DIR, `${slug}.md`);

  let filePath: string | null = null;

  if (fs.existsSync(mdxPath)) {
    filePath = mdxPath;
  } else if (fs.existsSync(mdPath)) {
    filePath = mdPath;
  }

  if (!filePath) {
    return null;
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  const frontmatter = normalizeFrontmatter(data, path.basename(filePath));

  // Check if post is unpublished in production
  if (process.env.NODE_ENV === 'production' && !frontmatter.published) {
    return null;
  }

  return {
    slug,
    frontmatter,
    content,
  };
}

/**
 * Get all post slugs for static generation
 */
export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) {
    return [];
  }

  const files = fs.readdirSync(BLOG_DIR);
  return files
    .filter((file) => file.endsWith('.mdx') || file.endsWith('.md'))
    .map((file) => file.replace(/\.mdx?$/, ''));
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
