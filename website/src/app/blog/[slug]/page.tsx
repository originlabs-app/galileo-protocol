import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import { getAllPostSlugs, getPostBySlug, formatDate } from '@/lib/blog';
import { JsonLd } from '@/components/seo/JsonLd';
import { Calendar, User, ArrowLeft, ChevronRight } from 'lucide-react';

const SITE_URL = 'https://www.galileoprotocol.io';
const TWITTER_SITE = '@GalileoProtocol';

/**
 * Generate static params for all blog posts
 * This enables static generation at build time
 */
export async function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

/**
 * Generate metadata for each blog post
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    // The frontmatter title is the full SERP title: bypass the root
    // layout template so it renders without the " | Galileo Protocol"
    // suffix (brand stays present via openGraph.siteName).
    title: { absolute: post.frontmatter.title },
    description: post.frontmatter.description,
    authors: [{ name: post.frontmatter.author }],
    alternates: {
      canonical: `/blog/${slug}`,
    },
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      url: `/blog/${slug}`,
      siteName: 'Galileo Protocol',
      type: 'article',
      publishedTime: post.frontmatter.date,
      modifiedTime: post.frontmatter.modified,
      authors: [post.frontmatter.author],
      tags: post.frontmatter.tags,
      // When no cover image is set, the file-based opengraph-image
      // convention of this route provides the default OG image.
      ...(post.frontmatter.coverImage
        ? {
            images: [
              {
                url: post.frontmatter.coverImage,
                alt: post.frontmatter.coverImageAlt || post.frontmatter.title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      site: TWITTER_SITE,
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      ...(post.frontmatter.coverImage
        ? { images: [post.frontmatter.coverImage] }
        : {}),
    },
  };
}

/**
 * MDX components for custom rendering
 * Blog-specific styling: cyan/emerald accents, Cormorant blockquotes, gradient HR
 */
const mdxComponents = {
  // Custom heading styles with cyan underline accent
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 {...props} className="text-3xl font-bold text-[var(--platinum)] mb-6" />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      {...props}
      className="relative text-2xl font-semibold text-[var(--platinum)] mt-10 mb-4 pb-3 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-16 after:h-0.5 after:bg-gradient-to-r after:from-[var(--cyan-primary)] after:to-transparent"
    />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      {...props}
      className="text-xl font-semibold text-[var(--platinum)] mt-8 mb-3"
    />
  ),
  // Links with cyan hover and bottom border
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      {...props}
      className="text-[var(--precision-blue)] hover:text-[var(--cyan-primary)] transition-colors border-b border-transparent hover:border-[var(--cyan-primary)] break-words"
    />
  ),
  // Code blocks with cyan border
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      {...props}
      className="bg-[var(--obsidian-elevated)] border border-[rgba(0,255,255,0.1)] rounded-xl p-5 overflow-x-auto my-6"
    />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => {
    // Inline code vs code blocks
    const isBlock = typeof props.children === 'string' && props.children.includes('\n');
    if (isBlock) {
      return <code {...props} className="text-sm font-mono" />;
    }
    return (
      <code
        {...props}
        className="bg-[rgba(0,255,255,0.1)] px-2 py-0.5 rounded text-sm font-mono text-[var(--cyan-primary)] break-all"
      />
    );
  },
  // Lists with cyan markers
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul {...props} className="list-disc my-4 space-y-2 text-[var(--platinum-dim)] pl-5 marker:text-[var(--cyan-primary)]" />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol {...props} className="list-decimal my-4 space-y-2 text-[var(--platinum-dim)] pl-5 marker:text-[var(--cyan-primary)]" />
  ),
  li: (props: React.LiHTMLAttributes<HTMLLIElement>) => (
    <li {...props} className="leading-relaxed pl-1" />
  ),
  // Blockquote with Cormorant font and cyan accent
  blockquote: (props: React.BlockquoteHTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      {...props}
      className="border-l-4 border-[var(--cyan-primary)] pl-6 pr-6 py-4 my-8 bg-[rgba(0,255,255,0.03)] rounded-r-lg font-serif text-lg italic text-[var(--platinum)]"
    />
  ),
  // Paragraph
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p {...props} className="my-4 leading-relaxed text-[var(--platinum-dim)]" />
  ),
  // Strong text in cyan
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong {...props} className="font-semibold text-[var(--cyan-primary)]" />
  ),
  // Horizontal rule with cyan gradient
  hr: () => (
    <hr
      className="my-10 border-0 h-px opacity-50"
      style={{
        background: 'linear-gradient(90deg, transparent, var(--cyan-primary) 20%, var(--cyan-primary) 80%, transparent)'
      }}
    />
  ),
};

/**
 * Blog post page component
 */
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const { frontmatter, content } = post;

  const articleUrl = `${SITE_URL}/blog/${slug}`;
  const imageUrl = frontmatter.coverImage
    ? new URL(frontmatter.coverImage, SITE_URL).toString()
    : `${SITE_URL}/blog/${slug}/opengraph-image`;

  const jsonLdGraph: Record<string, unknown>[] = [
    {
      '@type': 'BlogPosting',
      '@id': `${articleUrl}#article`,
      headline: frontmatter.title,
      description: frontmatter.description,
      image: imageUrl,
      datePublished: frontmatter.date,
      dateModified: frontmatter.modified,
      inLanguage: 'en',
      author: {
        '@type': 'Person',
        name: frontmatter.author,
      },
      publisher: {
        '@id': `${SITE_URL}/#organization`,
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': articleUrl,
      },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: SITE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Blog',
          item: `${SITE_URL}/blog`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: frontmatter.title,
          item: articleUrl,
        },
      ],
    },
  ];

  if (frontmatter.faq.length > 0) {
    jsonLdGraph.push({
      '@type': 'FAQPage',
      mainEntity: frontmatter.faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    });
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': jsonLdGraph,
  };

  return (
    <div className="ocean-background min-h-screen">
      <JsonLd data={jsonLd} />
      <main className="container pt-40 pb-16 md:pb-24">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-[var(--platinum-dim)]">
            <li>
              <Link
                href="/"
                className="hover:text-[var(--cyan-primary)] transition-colors"
              >
                Home
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="w-4 h-4 opacity-50" />
            </li>
            <li>
              <Link
                href="/blog"
                className="hover:text-[var(--cyan-primary)] transition-colors"
              >
                Blog
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="w-4 h-4 opacity-50" />
            </li>
            <li aria-current="page" className="text-[var(--platinum)] truncate max-w-[16rem] md:max-w-md">
              {frontmatter.title}
            </li>
          </ol>
        </nav>

        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-[var(--platinum-dim)] hover:text-[var(--cyan-primary)] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>

        <article className="w-full">
          {/* Header */}
          <header className="mb-12">
            {/* Tags */}
            {frontmatter.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {frontmatter.tags.map((tag) => (
                  <span key={tag} className="spec-badge spec-badge-active">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-[var(--platinum)] mb-6 leading-tight">
              {frontmatter.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-[var(--platinum-dim)]">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDate(frontmatter.date)}
              </span>
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {frontmatter.author}
              </span>
            </div>

            {/* Excerpt */}
            <p className="mt-6 text-xl text-[var(--platinum)] leading-relaxed">
              {frontmatter.excerpt}
            </p>
          </header>

          {/* Divider */}
          <hr className="border-t border-[rgba(229,229,229,0.1)] mb-12" />

          {/* Content */}
          <div className="prose prose-invert prose-full max-w-none">
            <MDXRemote
              source={content}
              components={mdxComponents}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
          </div>

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-[rgba(229,229,229,0.1)]">
            <div className="glass-card p-6 text-center">
              <p className="text-[var(--platinum-dim)] mb-4">
                Have questions or feedback about this post?
              </p>
              <a
                href="https://github.com/originlabs-app/galileo-protocol/discussions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--precision-blue)] hover:text-[var(--cyan-primary)] transition-colors"
              >
                Join the discussion on GitHub
              </a>
            </div>
          </footer>
        </article>
      </main>
    </div>
  );
}
