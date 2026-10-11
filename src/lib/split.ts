export type SplitMode = 'word' | 'char';

export function splitText(
  text: string,
  mode: SplitMode,
  locale?: string,
): string[] {
  const segmenter = new Intl.Segmenter(locale ?? 'th', {
    granularity: mode === 'char' ? 'grapheme' : 'word',
  });
  return Array.from(segmenter.segment(text), (s) => s.segment).filter(
    (segment) => !/^\s+$/.test(segment),
  );
}

export interface SplitToken {
  text: string;
  spaceAfter: boolean;
}

/**
 * Segments for `Split.astro`. `spaceAfter` marks where the source had a space,
 * so the rendered text (segments plus `.gap` spaces) equals the normalised
 * input for assistive tech and crawlers.
 */
export function splitTokens(text: string, mode: SplitMode): SplitToken[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  let cursor = 0;
  return splitText(normalized, mode).map((segment) => {
    cursor = normalized.indexOf(segment, cursor) + segment.length;
    return { text: segment, spaceAfter: normalized[cursor] === ' ' };
  });
}
