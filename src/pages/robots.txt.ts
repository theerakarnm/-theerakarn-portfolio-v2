import type { APIRoute } from 'astro';
import { SITE_URL } from '../content/site';

const aiCrawlers = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
];

const body = [
  'User-agent: *',
  'Allow: /',
  '',
  ...aiCrawlers.flatMap((agent) => [`User-agent: ${agent}`, 'Allow: /', '']),
  `Sitemap: ${SITE_URL}/sitemap-index.xml`,
  '',
].join('\n');

export const GET: APIRoute = () =>
  new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
