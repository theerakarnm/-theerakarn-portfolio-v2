import type { APIRoute } from 'astro';
import { org, person, projects } from '../content/site';
import { absoluteUrl } from '../lib/i18n';

const spellings = person.alternateNames
  .filter((n) => n !== person.name.en)
  .join(', ');
const orgLine = org.url ? `${org.name} (${org.url})` : org.name;

const body = `# ${person.name.en} (${person.name.th})

## English

${person.name.en} is the ${person.jobTitle.en} of ${org.name}, based in Thailand. The name is also written ${spellings}. ${person.description.en}

Company: ${orgLine} ${org.description.en}

Areas of work: ${person.knowsAbout.join(', ')}.

### Projects

${projects.map((p) => `#### ${p.name}\n\n${p.url}\n\n${p.description.en}`).join('\n\n')}

### Contact and profiles

- Showreel: ${absoluteUrl('en')}
${person.email.map((e) => `- Email: ${e}`).join('\n')}
${person.sameAs.map((url) => `- ${url}`).join('\n')}

## ภาษาไทย

${person.name.th} (${person.name.en}) ${person.jobTitle.th} ของ ${org.name} ประเทศไทย ชื่อของเขาเขียนได้อีกแบบว่า ${spellings} ${person.description.th}

บริษัท: ${orgLine} ${org.description.th}

### ผลงาน

${projects.map((p) => `#### ${p.name}\n\n${p.url}\n\n${p.description.th}`).join('\n\n')}

### ติดต่อและโปรไฟล์

- Showreel: ${absoluteUrl('th')}
${person.email.map((e) => `- อีเมล: ${e}`).join('\n')}
${person.sameAs.map((url) => `- ${url}`).join('\n')}
`;

export const GET: APIRoute = () =>
  new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
