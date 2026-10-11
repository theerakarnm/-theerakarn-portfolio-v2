import type { APIRoute } from 'astro';
import { org, person, projects, SITE_URL } from '../content/site';
import { absoluteUrl } from '../lib/i18n';

const orgName = org.url ? `[${org.name}](${org.url})` : org.name;

const body = `# ${person.name.en} (${person.name.th})

> ${person.name.en}, also written ${person.alternateNames.filter((n) => n !== person.name.en).join(', ')}, is the ${person.jobTitle.en} of ${org.name} ${person.description.en}

## Profile

- [Showreel (Thai)](${absoluteUrl('th')}): ${person.description.th}
- [Showreel (English)](${absoluteUrl('en')}): ${person.description.en}
- [Full biography](${SITE_URL}/llms-full.txt): Long-form profile in English and Thai.
- Company: ${orgName} - ${org.description.en}

## Projects

${projects.map((p) => `- [${p.name}](${p.url}): ${p.description.en}`).join('\n')}

## Contact

${person.email.map((e) => `- [${e}](mailto:${e})`).join('\n')}
${person.sameAs.map((url) => `- [${new URL(url).hostname}](${url})`).join('\n')}
`;

export const GET: APIRoute = () =>
  new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
