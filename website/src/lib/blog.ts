import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

/**
 * Blog post frontmatter and content types
 */
export interface BlogPostFrontmatter {
  title: string;
  date: string;
  excerpt: string;
  author: string;
  tags: string[];
  coverImage?: string;
  published?: boolean;
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

      const frontmatter: BlogPostFrontmatter = {
        title: data.title || 'Untitled',
        date: data.date || new Date().toISOString(),
        excerpt: data.excerpt || '',
        author: data.author || 'Galileo Team',
        tags: data.tags || [],
        coverImage: data.coverImage,
        published: data.published !== false, // Default to true if not specified
      };

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

  const frontmatter: BlogPostFrontmatter = {
    title: data.title || 'Untitled',
    date: data.date || new Date().toISOString(),
    excerpt: data.excerpt || '',
    author: data.author || 'Galileo Team',
    tags: data.tags || [],
    coverImage: data.coverImage,
    published: data.published !== false,
  };

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
