import { type Lang, org, person, projects, SITE_URL } from '../content/site';
import { absoluteUrl } from './i18n';

const personId = `${SITE_URL}/#person`;
const orgId = `${SITE_URL}/#org`;
const websiteId = `${SITE_URL}/#website`;

const inLanguage: Record<Lang, string> = { th: 'th-TH', en: 'en-US' };

export function jsonLd(lang: Lang): {
  '@context': 'https://schema.org';
  '@graph': object[];
} {
  const [givenName, familyName] = person.name.en.split(' ');
  const orgUrl = org.url ? { url: org.url } : {};

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': personId,
        name: person.name.en,
        alternateName: person.alternateNames,
        givenName,
        familyName,
        jobTitle: person.jobTitle[lang],
        description: person.description[lang],
        worksFor: { '@id': orgId },
        url: `${SITE_URL}/`,
        image: `${SITE_URL}/og.png`,
        email: person.email.map((address) => `mailto:${address}`),
        sameAs: person.sameAs,
        knowsAbout: person.knowsAbout,
        address: { '@type': 'PostalAddress', addressCountry: 'TH' },
      },
      {
        '@type': 'Corporation',
        '@id': orgId,
        name: org.name,
        description: org.description[lang],
        founder: { '@id': personId },
        ...orgUrl,
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: `${SITE_URL}/`,
        name: person.name.en,
        inLanguage: [inLanguage.th, inLanguage.en],
        publisher: { '@id': personId },
      },
      {
        '@type': 'ProfilePage',
        '@id': `${absoluteUrl(lang)}#profile`,
        url: absoluteUrl(lang),
        inLanguage: inLanguage[lang],
        isPartOf: { '@id': websiteId },
        mainEntity: { '@id': personId },
        dateModified: new Date().toISOString(),
      },
      ...projects.map((project) => ({
        '@type': 'CreativeWork',
        '@id': `${SITE_URL}/#project-${project.id}`,
        name: project.name,
        url: project.url,
        description: project.description[lang],
        inLanguage: inLanguage[lang],
        creator: { '@id': personId },
      })),
    ],
  };
}
