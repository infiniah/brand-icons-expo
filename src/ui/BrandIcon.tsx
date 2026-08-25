import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  argb, hexString, relativeLuminance,
} from '../core/types';
import type { BrandColor, BrandIconCandidate, BrandIconShape } from '../core/types';
import { parsePath } from '../vector/svgPathParser';
import type { PathSegment } from '../vector/pathSegment';
import { UNSET_FILL_COLOR, markColors } from './markColors';

export interface BrandIconProps {
  readonly candidate?: BrandIconCandidate;
  readonly size?: number;
  readonly fallbackText?: string;
  readonly cornerRadius?: number;
  /**
   * The surface the icon is drawn on.
   *
   * A mark whose own colour is too close to this gets a contrasting tile. GitHub's `#181717` is
   * otherwise invisible on a dark background.
   */
  readonly surfaceLuminance?: number;
}

const UNSET_FILL = hexString(UNSET_FILL_COLOR);
const CONTRAST_THRESHOLD = 0.22;

/**
 * Draws a resolved candidate.
 *
 * A vector is emitted as SVG paths, so it stays sharp at any size. Raster artwork is an `Image`.
 * A candidate with no shape falls back to a monogram rather than a blank square, because an empty
 * box in a list reads as a bug where a letter reads as "not found".
 */
export function BrandIcon({
  candidate,
  size = 40,
  fallbackText,
  cornerRadius,
  surfaceLuminance = 0.96,
}: BrandIconProps): React.ReactElement {
  const radius = cornerRadius ?? size * 0.28;
  const shape = candidate?.shape;

  const colors = markColors(shape);
  const needsTile =
    colors.length > 0 &&
    colors.every((color) => Math.abs(relativeLuminance(color) - surfaceLuminance) < CONTRAST_THRESHOLD);
  const inset = needsTile ? size * 0.18 : 0;

  const paths = useMemo(() => (shape ? drawablePaths(shape) : []), [shape]);

  const container = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: radius,
      backgroundColor: needsTile
        ? colors.every((color) => relativeLuminance(color) < 0.5)
          ? '#f2f2f0'
          : '#1c1c1e'
        : 'transparent',
    },
  ];

  if (!shape) {
    return (
      <View style={[...container, { backgroundColor: '#e8e8ed' }]}>
        <Text style={{ fontSize: size * 0.42, fontWeight: '600', color: '#6c6c76' }}>
          {(fallbackText ?? candidate?.title ?? '?').trim().charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
    );
  }

  if (shape.kind === 'raster') {
    return (
      <View style={container}>
        <Image
          source={{ uri: shape.uri }}
          style={{ width: size, height: size, borderRadius: radius }}
          resizeMode="contain"
        />
      </View>
    );
  }

  const drawn = size - inset * 2;
  return (
    <View style={container}>
      <Svg width={drawn} height={drawn} viewBox={`0 0 ${shape.viewBoxWidth} ${shape.viewBoxHeight}`}>
        {paths.map((entry, index) => (
          <Path
            key={index}
            d={entry.d}
            fill={entry.fill}
            fillRule={entry.isEvenOdd ? 'evenodd' : 'nonzero'}
          />
        ))}
      </Svg>
    </View>
  );
}

interface DrawablePath {
  readonly d: string;
  readonly fill: string;
  readonly isEvenOdd: boolean;
}

/**
 * Re-emits each path through the parser rather than passing the source string to `react-native-svg`.
 *
 * The round trip is what keeps this port drawing the same shape as the others: the same parser is
 * pinned by `golden-geometry.json`, whereas the renderer's own parser is not.
 */
function drawablePaths(shape: BrandIconShape): DrawablePath[] {
  if (shape.kind === 'vector') {
    const segments = parsePath(shape.path);
    if (!segments) return [];
    return [{
      d: toPathData(segments),
      fill: shape.tint ? hexString(shape.tint) : UNSET_FILL,
      isEvenOdd: false,
    }];
  }
  if (shape.kind === 'layered') {
    const output: DrawablePath[] = [];
    for (const layer of shape.layers) {
      const segments = parsePath(layer.path);
      if (!segments) continue;
      output.push({
        d: toPathData(segments),
        fill: layer.fill ? hexString(layer.fill) : UNSET_FILL,
        isEvenOdd: layer.isEvenOdd === true,
      });
    }
    return output;
  }
  return [];
}

function toPathData(segments: readonly PathSegment[]): string {
  let out = '';
  for (const segment of segments) {
    switch (segment.kind) {
      case 'M': out += `M${segment.x} ${segment.y}`; break;
      case 'L': out += `L${segment.x} ${segment.y}`; break;
      case 'C':
        out += `C${segment.c1x} ${segment.c1y} ${segment.c2x} ${segment.c2y} ${segment.x} ${segment.y}`;
        break;
      case 'Q': out += `Q${segment.cx} ${segment.cy} ${segment.x} ${segment.y}`; break;
      case 'Z': out += 'Z'; break;
    }
  }
  return out;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});

export { argb };
