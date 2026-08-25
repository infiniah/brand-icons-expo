import type { BundledMark } from '@infiniah/brand-icons';

export type MarkFacet = 'all' | 'colour' | 'mono' | 'restricted';

export const FACETS: readonly { key: MarkFacet; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'colour', label: 'Colour' },
  { key: 'mono', label: 'One tint' },
  { key: 'restricted', label: 'Restricted' },
];

const RESTRICTIVE = /-NC|-ND/;

export function inFacet(mark: BundledMark, facet: MarkFacet): boolean {
  switch (facet) {
    case 'all': return true;
    case 'colour': return mark.layers.length > 0;
    case 'mono': return mark.layers.length === 0;
    case 'restricted': return RESTRICTIVE.test(mark.license?.type ?? '');
  }
}
