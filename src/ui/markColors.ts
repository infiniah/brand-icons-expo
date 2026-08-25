import type { BrandColor, BrandIconShape } from '../core/types';

/** What SVG paints a path with no `fill` attribute. */
export const UNSET_FILL_COLOR: BrandColor = { red: 0x1c, green: 0x1c, blue: 0x1e };

/**
 * Every colour the mark is actually painted in.
 *
 * An unfilled layer is painted [UNSET_FILL_COLOR], so it counts. Dropping it leaves a mark whose
 * layers carry no fill reporting no colours at all, and a black mark then lands untiled on a
 * black surface.
 */
export function markColors(shape: BrandIconShape | undefined): BrandColor[] {
  if (shape?.kind === 'vector') return shape.tint ? [shape.tint] : [];
  if (shape?.kind === 'layered') return shape.layers.map((layer) => layer.fill ?? UNSET_FILL_COLOR);
  return [];
}
