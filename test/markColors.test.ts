import { readFileSync } from 'node:fs';
import { parseCatalog } from '../src/catalog/brandCatalog';
import { shapeFor } from '../src/providers/bundledIconProvider';
import { markColors } from '../src/ui/markColors';

const catalog = parseCatalog(JSON.parse(readFileSync('assets/brand-marks.json', 'utf8')));

describe('mark colours', () => {
  it('counts a layer with no fill of its own', () => {
    const mark = catalog.mark('3m');
    expect(mark).toBeDefined();
    expect(mark!.layers.every((layer) => !layer.fill)).toBe(true);

    const colors = markColors(shapeFor(mark!));
    expect(colors).toHaveLength(mark!.layers.length);
    expect(colors.every((color) => color.red === 0x1c)).toBe(true);
  });

  it('reports a colour for every layer of every mark', () => {
    const short: string[] = [];
    for (const mark of catalog.marks) {
      if (mark.layers.length === 0) continue;
      if (markColors(shapeFor(mark)).length !== mark.layers.length) short.push(mark.slug);
    }
    expect(short).toEqual([]);
  });
});
