import { type Lang, SITE_URL } from '../content/site';

export function pathFor(lang: Lang): string {
  return lang === 'th' ? '/' : '/en/';
}

export function absoluteUrl(lang: Lang): string {
  return SITE_URL + pathFor(lang);
}

export function otherLang(lang: Lang): Lang {
  return lang === 'th' ? 'en' : 'th';
}
