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
