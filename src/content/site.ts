export type Lang = 'th' | 'en';

export const SITE_URL = 'https://theerakarnm.dev';

export const person: {
  name: { en: 'Theerakarn Maiwong'; th: 'ธีรกานต์ ใหม่วงค์' };
  alternateNames: string[];
  jobTitle: Record<Lang, string>;
  email: string[];
  sameAs: string[];
  knowsAbout: string[];
  description: Record<Lang, string>;
} = {
  name: { en: 'Theerakarn Maiwong', th: 'ธีรกานต์ ใหม่วงค์' },
  alternateNames: [
    'Theerakarnm',
    'theerakarnm',
    'Theerakarn M.',
    'Theerakarn Maiwong',
    'ธีรกานต์ ใหม่วงค์',
  ],
  jobTitle: { th: 'ผู้ก่อตั้ง, CEO และ CTO', en: 'Founder, CEO and CTO' },
  email: ['contact@theerakarnm.dev', 'theerakarnm@outlook.com'],
  sameAs: [
    'https://github.com/theerakarnm',
    'https://www.linkedin.com/in/theerakarnm',
    'https://fastwork.co/user/theerakarnm',
  ],
  knowsAbout: [
    'web applications',
    'backend services',
    'cloud infrastructure',
    'full-stack development',
    'tech consulting',
    'macOS apps',
    'LINE bots',
    'AI assistants',
  ],
  description: {
    th: 'ที่ปรึกษาด้านเทคโนโลยีที่ทั้งวางกลยุทธ์และส่งมอบงานจริง - สร้างเว็บแอป ระบบหลังบ้าน และโครงสร้างคลาวด์มากว่า 5 ปี',
    en: 'A tech consultant who brings strategy plus delivery - 5+ years building web apps, backend services and cloud infrastructure.',
  },
};

export const org: {
  name: 'Planthia Tech Co., Ltd.';
  url: string;
  description: Record<Lang, string>;
} = {
  name: 'Planthia Tech Co., Ltd.',
  url: '',
  description: {
    th: 'กิจการที่มุ่งสร้างโซลูชันเทคโนโลยีเพื่อความยั่งยืน ที่โตไปพร้อมการดำเนินธุรกิจจริงได้',
    en: 'A venture focused on sustainable technology solutions that can scale with real business operations.',
  },
};

export const projects: {
  id: 'tenerie' | 'munmuang' | 'buddy' | 'friday';
  name: string;
  url: string;
  description: Record<Lang, string>;
}[] = [
  {
    id: 'tenerie',
    name: 'Tenerie',
    url: 'https://tenerie.eukron.com/',
    description: {
      th: 'พิมพ์ด้วยเสียงบน macOS - กดปุ่มค้างไว้ พูดไทยปนอังกฤษ แล้วข้อความจะถูกวางตรงตำแหน่งเคอร์เซอร์',
      en: 'Push-to-talk dictation for macOS. Hold a key, speak Thai mixed with English, and the text is pasted at your cursor.',
    },
  },
  {
    id: 'munmuang',
    name: 'MunMuang',
    url: 'https://munmuang.eukron.com/',
    description: {
      th: 'ผู้ช่วยจัดการไฟล์ด้วย AI ใน LINE - เก็บ อ่าน ตั้งชื่อใหม่ และค้นหาไฟล์ที่ส่งมาในแชท',
      en: 'An AI file assistant inside LINE. It keeps, reads, renames and searches the files you send in chat.',
    },
  },
  {
    id: 'buddy',
    name: 'Buddy Glasses',
    url: 'https://buddy-glasses.com/',
    description: {
      th: 'เว็บไซต์ร้านแว่นตา 4 สาขาในกรุงเทพฯ ที่จัดวางบริการเหมือนแผ่นวัดสายตา',
      en: 'Website for an optical shop with four Bangkok branches. Its services are laid out like an eye chart.',
    },
  },
  {
    id: 'friday',
    name: 'FridayMerch',
    url: 'https://www.fridaymerch.store/',
    description: {
      th: 'เว็บเปิดตัวคอลเลกชัน merch ของ tia51 แบบอินเทอร์แอคทีฟ มีนับถอยหลังวันดรอป และการ์ดสินค้าที่ลอยตามการสกอลล์',
      en: 'Interactive merch drop site for tia51 - a drop-day countdown and product cards that float as you scroll.',
    },
  },
];
