/**
 * One drawing step, in the source coordinate space.
 *
 * The parser produces these rather than an SVG string so parsing can be tested without a render
 * surface, and so the same parsed shape can be handed to any painter.
 */
export type PathSegment =
  | { readonly kind: 'M'; readonly x: number; readonly y: number }
  | { readonly kind: 'L'; readonly x: number; readonly y: number }
  | { readonly kind: 'C'; readonly c1x: number; readonly c1y: number;
      readonly c2x: number; readonly c2y: number; readonly x: number; readonly y: number }
  | { readonly kind: 'Q'; readonly cx: number; readonly cy: number;
      readonly x: number; readonly y: number }
  | { readonly kind: 'Z' };
