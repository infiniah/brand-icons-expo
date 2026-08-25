import { readFileSync } from 'node:fs';
import { parseCatalog } from '../src/catalog/brandCatalog';
import { parsePath } from '../src/vector/svgPathParser';

interface Row {
  slug: string;
  kinds: string;
  bounds: number[];
  points: number[];
}

const reference: Row[] = JSON.parse(readFileSync('test/fixtures/golden-geometry.json', 'utf8'));
const catalog = parseCatalog(JSON.parse(readFileSync('assets/brand-marks.json', 'utf8')));

/**
 * Proves this port's path parser draws the same shape as the Swift reference.
 *
 * The corpus proves the ports agree about *which* brand a name means. It says nothing about
 * whether they draw the same thing, and a parser that mishandles an arc produces a mangled icon at
 * a perfect confidence score.
 */
describe('golden geometry', () => {
  it('parses every reference mark to the same elements', () => {
    for (const row of reference) {
      const mark = catalog.mark(row.slug);
      expect(mark).toBeDefined();

      const segments = parsePath(mark!.path);
      expect([row.slug, segments !== undefined]).toEqual([row.slug, true]);

      const kinds = segments!.map((segment) => segment.kind).join('');
      expect([row.slug, kinds]).toEqual([row.slug, row.kinds]);

      const points: number[] = [];
      for (const segment of segments!) {
        switch (segment.kind) {
          case 'M':
          case 'L':
            points.push(segment.x, segment.y);
            break;
          case 'Q':
            points.push(segment.cx, segment.cy, segment.x, segment.y);
            break;
          case 'C':
            points.push(segment.c1x, segment.c1y, segment.c2x, segment.c2y, segment.x, segment.y);
            break;
          case 'Z':
            break;
        }
      }

      expect([row.slug, points.length]).toEqual([row.slug, row.points.length]);
      points.forEach((value, index) => {
        expect(Math.abs(value - row.points[index]!)).toBeLessThan(0.01);
      });
    }
  });

  it('parses every mark and every layer in the catalogue', () => {
    const failed: string[] = [];
    let paths = 0;
    for (const mark of catalog.marks) {
      // A mark with colour layers carries no flattened path, so there is nothing to parse.
      if (mark.path.length > 0) {
        paths++;
        if (!parsePath(mark.path)) failed.push(`${mark.slug}: mono`);
      }
      mark.layers.forEach((layer, index) => {
        paths++;
        if (!parsePath(layer.path)) failed.push(`${mark.slug}: layer ${index}`);
      });
    }
    expect(failed).toEqual([]);
    expect(paths).toBeGreaterThan(4000);
  });
});
