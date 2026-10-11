import { describe, expect, test } from 'bun:test';
import { splitText } from '../../src/lib/split';

describe('splitText', () => {
  test('word mode drops whitespace and keeps punctuation as its own segment', () => {
    const tokens = splitText('Founder, CEO & CTO', 'word');
    expect(tokens).toEqual(['Founder', ',', 'CEO', '&', 'CTO']);
    // The reference renders a punctuation segment flush against the previous word.
    expect(tokens.join(' ').replace(/ ([,.])/g, '$1')).toBe(
      'Founder, CEO & CTO',
    );
  });

  test('char mode splits into graphemes', () => {
    expect(splitText('THEERAKARN', 'char')).toHaveLength(10);
  });

  test('thai segments rejoin to the input without spaces', () => {
    const text = 'ที่ปรึกษาด้านเทคโนโลยี สร้างเว็บแอป ระบบหลังบ้าน';
    expect(splitText(text, 'word').join('')).toBe(text.replace(/\s+/g, ''));
  });
});
