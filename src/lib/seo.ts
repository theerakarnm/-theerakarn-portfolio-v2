import type { Lang } from '../content/site';
import { absoluteUrl, otherLang } from './i18n';

const titles: Record<Lang, string> = {
  th: 'ธีรกานต์ ใหม่วงค์ (Theerakarn Maiwong) - ผู้ก่อตั้ง Planthia Tech',
  en: 'Theerakarn Maiwong (theerakarnm) - Founder & CEO, Planthia Tech',
};

const descriptions: Record<Lang, string> = {
  th: 'ธีรกานต์ ใหม่วงค์ (Theerakarnm) ผู้ก่อตั้ง CEO และ CTO ของ Planthia Tech ที่ปรึกษาเทคโนโลยีที่ทั้งวางกลยุทธ์และส่งมอบงานจริง: เว็บแอป ระบบหลังบ้าน และโครงสร้างคลาวด์',
  en: 'Theerakarn Maiwong (theerakarnm) - founder, CEO and CTO of Planthia Tech. A tech consultant who brings strategy plus delivery: web apps, backend and cloud.',
};

const ogLocales: Record<Lang, string> = { th: 'th_TH', en: 'en_US' };

export function seoFor(lang: Lang): {
  title: string;
  description: string;
  canonical: string;
  ogLocale: string;
  ogAlternate: string;
} {
  return {
    title: titles[lang],
    description: descriptions[lang],
    canonical: absoluteUrl(lang),
    ogLocale: ogLocales[lang],
    ogAlternate: ogLocales[otherLang(lang)],
  };
}
