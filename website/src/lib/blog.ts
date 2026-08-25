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

/**
 * Normalize raw gray-matter frontmatter into BlogPostFrontmatter
 */
function normalizeFrontmatter(data: Record<string, unknown>): BlogPostFrontmatter {
  const rawFaq = Array.isArray(data.faq) ? data.faq : [];
  const faq: BlogFaqItem[] = rawFaq
    .filter(
      (item): item is { question: unknown; answer: unknown } =>
        typeof item === 'object' && item !== null
    )
    .map((item) => ({
      question: String(item.question ?? ''),
      answer: String(item.answer ?? ''),
    }))
    .filter((item) => item.question.length > 0 && item.answer.length > 0);

  const date = (data.date as string) || new Date().toISOString();
  const excerpt = (data.excerpt as string) || '';

  return {
    title: (data.title as string) || 'Untitled',
    date,
    modified: (data.modified as string) || date,
    excerpt,
    description: (data.description as string) || excerpt,
    author: (data.author as string) || 'Galileo Team',
    tags: (data.tags as string[]) || [],
    coverImage: data.coverImage as string | undefined,
    coverImageAlt: data.coverImageAlt as string | undefined,
    faq,
    published: data.published !== false, // Default to true if not specified
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

      const frontmatter = normalizeFrontmatter(data);

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

  const frontmatter = normalizeFrontmatter(data);

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
