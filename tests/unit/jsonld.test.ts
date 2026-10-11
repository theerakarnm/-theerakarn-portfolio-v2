import { describe, expect, test } from 'bun:test';
import type { Lang } from '../../src/content/site';
import { jsonLd } from '../../src/lib/jsonld';

type Node = Record<string, unknown>;

const refId = (value: unknown): string | undefined =>
  typeof value === 'object' && value !== null && '@id' in value
    ? String((value as { '@id': unknown })['@id'])
    : undefined;

describe.each(['th', 'en'] as Lang[])('jsonLd(%s)', (lang) => {
  const data = JSON.parse(JSON.stringify(jsonLd(lang)));
  const graph: Node[] = data['@graph'];

  test('round-trips through JSON', () => {
    expect(data['@context']).toBe('https://schema.org');
    expect(graph.length).toBeGreaterThan(0);
  });

  test('has exactly one Person with every alias and three profiles', () => {
    const people = graph.filter((node) => node['@type'] === 'Person');
    expect(people).toHaveLength(1);
    const alternateName = people[0].alternateName as string[];
    expect(alternateName).toContain('Theerakarnm');
    expect(alternateName).toContain('ธีรกานต์ ใหม่วงค์');
    expect(people[0].sameAs as string[]).toHaveLength(3);
  });

  test('every referenced @id exists in the graph', () => {
    const ids = new Set(graph.map((node) => node['@id']));
    const refs = graph.flatMap((node) =>
      ['worksFor', 'founder', 'mainEntity', 'creator', 'publisher', 'isPartOf']
        .map((key) => refId(node[key]))
        .filter((id): id is string => id !== undefined),
    );
    expect(refs.length).toBeGreaterThanOrEqual(3);
    for (const id of refs) expect(ids.has(id)).toBe(true);
  });
});

describe('jsonLd across languages', () => {
  const nodeOf = (lang: Lang, type: string) =>
    (jsonLd(lang)['@graph'] as Node[]).find(
      (node) => node['@type'] === type,
    ) as Node;

  test('each page has its own ProfilePage @id', () => {
    expect(nodeOf('th', 'ProfilePage')['@id']).not.toBe(
      nodeOf('en', 'ProfilePage')['@id'],
    );
  });

  test('Person has the same url on every page', () => {
    expect(nodeOf('th', 'Person').url).toBe(nodeOf('en', 'Person').url);
  });
});
