import type { MetadataRoute } from 'next';

// AI assistants and generative search crawlers explicitly allowed (GEO).
const AI_USER_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Amazonbot',
  'Bytespider',
  'CCBot',
  'Meta-ExternalAgent',
  'MistralAI-User',
  'DuckAssistBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
      {
        userAgent: AI_USER_AGENTS,
        allow: '/',
      },
    ],
    sitemap: 'https://www.galileoprotocol.io/sitemap.xml',
  };
}
