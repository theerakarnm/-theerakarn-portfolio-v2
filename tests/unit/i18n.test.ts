import { describe, expect, test } from 'bun:test';
import { absoluteUrl, otherLang, pathFor } from '../../src/lib/i18n';

describe('i18n helpers', () => {
  test('pathFor serves Thai at the root', () => {
    expect(pathFor('th')).toBe('/');
  });

  test('pathFor prefixes English with /en/', () => {
    expect(pathFor('en')).toBe('/en/');
  });

  test('absoluteUrl builds the full English URL', () => {
    expect(absoluteUrl('en')).toBe('https://theerakarnm.dev/en/');
  });

  test('otherLang flips the language', () => {
    expect(otherLang('th')).toBe('en');
  });
});
