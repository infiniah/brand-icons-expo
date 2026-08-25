import type { PathSegment } from './pathSegment';

/**
 * Turns SVG path data into drawable segments.
 *
 * The whole command set is supported: absolute and relative forms, commands whose letter is given
 * once and whose operands repeat, elliptical arcs, and the smooth curve forms `S` and `T`.
 *
 * The result is in the source coordinate space, where y grows downwards.
 */

const SEPARATORS = new Set([0x20, 0x09, 0x0a, 0x0d, 0x0c, 0x0b, 0x2c]);
const COMMANDS = 'mzlhvcsqta';

type Kind = 'move' | 'close' | 'line' | 'hline' | 'vline'
  | 'cubic' | 'smoothCubic' | 'quad' | 'smoothQuad' | 'arc';

const KINDS: Record<string, Kind> = {
  m: 'move', z: 'close', l: 'line', h: 'hline', v: 'vline',
  c: 'cubic', s: 'smoothCubic', q: 'quad', t: 'smoothQuad', a: 'arc',
};

class Scanner {
  private index = 0;
  constructor(private readonly text: string) {}

  private skip(): void {
    while (this.index < this.text.length && SEPARATORS.has(this.text.charCodeAt(this.index))) {
      this.index++;
    }
  }

  get isAtEnd(): boolean {
    let probe = this.index;
    while (probe < this.text.length && SEPARATORS.has(this.text.charCodeAt(probe))) probe++;
    return probe >= this.text.length;
  }

  get hasNumber(): boolean {
    let probe = this.index;
    while (probe < this.text.length && SEPARATORS.has(this.text.charCodeAt(probe))) probe++;
    if (probe >= this.text.length) return false;
    const code = this.text.charCodeAt(probe);
    return isDigit(code) || code === 0x2d || code === 0x2b || code === 0x2e;
  }

  nextCommand(): { kind: Kind; isRelative: boolean } | undefined {
    this.skip();
    if (this.index >= this.text.length) return undefined;
    const character = this.text[this.index]!;
    const lowered = character.toLowerCase();
    if (!COMMANDS.includes(lowered)) return undefined;
    this.index++;
    return { kind: KINDS[lowered]!, isRelative: character === lowered };
  }

  nextNumber(): number | undefined {
    this.skip();
    if (this.index >= this.text.length) return undefined;

    const start = this.index;
    let sawDigit = false;
    let sawPoint = false;

    let code = this.text.charCodeAt(this.index);
    if (code === 0x2d || code === 0x2b) this.index++;

    while (this.index < this.text.length) {
      code = this.text.charCodeAt(this.index);
      if (isDigit(code)) {
        sawDigit = true;
        this.index++;
      } else if (code === 0x2e && !sawPoint) {
        sawPoint = true;
        this.index++;
      } else break;
    }

    if (!sawDigit) {
      this.index = start;
      return undefined;
    }

    code = this.text.charCodeAt(this.index);
    if (code === 0x65 || code === 0x45) {
      const beforeExponent = this.index;
      this.index++;
      code = this.text.charCodeAt(this.index);
      if (code === 0x2d || code === 0x2b) this.index++;
      let sawExponentDigit = false;
      while (this.index < this.text.length && isDigit(this.text.charCodeAt(this.index))) {
        sawExponentDigit = true;
        this.index++;
      }
      if (!sawExponentDigit) this.index = beforeExponent;
    }

    const value = Number.parseFloat(this.text.slice(start, this.index));
    if (!Number.isFinite(value)) {
      this.index = start;
      return undefined;
    }
    return value;
  }

  /** An arc flag, which the grammar defines as the single character `0` or `1`. */
  nextFlag(): boolean | undefined {
    this.skip();
    if (this.index >= this.text.length) return undefined;
    const code = this.text.charCodeAt(this.index);
    if (code !== 0x30 && code !== 0x31) return undefined;
    this.index++;
    return code === 0x31;
  }
}

function isDigit(code: number): boolean {
  return code >= 0x30 && code <= 0x39;
}

/**
 * The segments drawn by `pathData`, or undefined when it is empty, malformed, or draws nothing.
 *
 * Parsing is strict: unreadable data returns undefined rather than a partial shape, because half
 * an icon is worse than none. Malformed input never throws.
 */
export function parsePath(pathData: string): PathSegment[] | undefined {
  const scanner = new Scanner(pathData);
  const segments: PathSegment[] = [];

  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  let cubicX: number | undefined;
  let cubicY: number | undefined;
  let quadX: number | undefined;
  let quadY: number | undefined;
  let last: { kind: Kind; isRelative: boolean } | undefined;
  let isOpen = false;

  for (;;) {
    const next = scanner.nextCommand();
    let command: { kind: Kind; isRelative: boolean };
    if (next) command = next;
    else if (scanner.isAtEnd) break;
    else if (last && last.kind !== 'close' && scanner.hasNumber) {
      // The grammar lets a command letter be given once and its operands repeated, so `M0 0 1 1`
      // is a move followed by a line.
      command = last.kind === 'move' ? { kind: 'line', isRelative: last.isRelative } : last;
    } else return undefined;

    if (!last && command.kind !== 'move') return undefined;

    const ax = (value: number): number => (command.isRelative ? currentX + value : value);
    const ay = (value: number): number => (command.isRelative ? currentY + value : value);
    const open = (): void => {
      if (isOpen) return;
      segments.push({ kind: 'M', x: currentX, y: currentY });
      isOpen = true;
    };
    const clearControls = (): void => {
      cubicX = cubicY = quadX = quadY = undefined;
    };

    switch (command.kind) {
      case 'move': {
        const x = scanner.nextNumber();
        const y = scanner.nextNumber();
        if (x === undefined || y === undefined) return undefined;
        currentX = ax(x); currentY = ay(y);
        startX = currentX; startY = currentY;
        segments.push({ kind: 'M', x: currentX, y: currentY });
        isOpen = true;
        clearControls();
        break;
      }
      case 'close': {
        if (isOpen) {
          segments.push({ kind: 'Z' });
          isOpen = false;
        }
        currentX = startX; currentY = startY;
        clearControls();
        break;
      }
      case 'line': {
        const x = scanner.nextNumber();
        const y = scanner.nextNumber();
        if (x === undefined || y === undefined) return undefined;
        open();
        currentX = ax(x); currentY = ay(y);
        segments.push({ kind: 'L', x: currentX, y: currentY });
        clearControls();
        break;
      }
      case 'hline': {
        const x = scanner.nextNumber();
        if (x === undefined) return undefined;
        open();
        currentX = command.isRelative ? currentX + x : x;
        segments.push({ kind: 'L', x: currentX, y: currentY });
        clearControls();
        break;
      }
      case 'vline': {
        const y = scanner.nextNumber();
        if (y === undefined) return undefined;
        open();
        currentY = command.isRelative ? currentY + y : y;
        segments.push({ kind: 'L', x: currentX, y: currentY });
        clearControls();
        break;
      }
      case 'cubic': {
        const values = readAll(scanner, 6);
        if (!values) return undefined;
        open();
        const c1x = ax(values[0]!), c1y = ay(values[1]!);
        const c2x = ax(values[2]!), c2y = ay(values[3]!);
        currentX = ax(values[4]!); currentY = ay(values[5]!);
        segments.push({ kind: 'C', c1x, c1y, c2x, c2y, x: currentX, y: currentY });
        cubicX = c2x; cubicY = c2y; quadX = quadY = undefined;
        break;
      }
      case 'smoothCubic': {
        const values = readAll(scanner, 4);
        if (!values) return undefined;
        open();
        const c1x = reflect(cubicX, currentX), c1y = reflect(cubicY, currentY);
        const c2x = ax(values[0]!), c2y = ay(values[1]!);
        currentX = ax(values[2]!); currentY = ay(values[3]!);
        segments.push({ kind: 'C', c1x, c1y, c2x, c2y, x: currentX, y: currentY });
        cubicX = c2x; cubicY = c2y; quadX = quadY = undefined;
        break;
      }
      case 'quad': {
        const values = readAll(scanner, 4);
        if (!values) return undefined;
        open();
        const cx = ax(values[0]!), cy = ay(values[1]!);
        currentX = ax(values[2]!); currentY = ay(values[3]!);
        segments.push({ kind: 'Q', cx, cy, x: currentX, y: currentY });
        quadX = cx; quadY = cy; cubicX = cubicY = undefined;
        break;
      }
      case 'smoothQuad': {
        const values = readAll(scanner, 2);
        if (!values) return undefined;
        open();
        const cx = reflect(quadX, currentX), cy = reflect(quadY, currentY);
        currentX = ax(values[0]!); currentY = ay(values[1]!);
        segments.push({ kind: 'Q', cx, cy, x: currentX, y: currentY });
        quadX = cx; quadY = cy; cubicX = cubicY = undefined;
        break;
      }
      case 'arc': {
        const rx = scanner.nextNumber();
        const ry = scanner.nextNumber();
        const degrees = scanner.nextNumber();
        const largeArc = scanner.nextFlag();
        const sweep = scanner.nextFlag();
        const x = scanner.nextNumber();
        const y = scanner.nextNumber();
        if (rx === undefined || ry === undefined || degrees === undefined ||
            largeArc === undefined || sweep === undefined || x === undefined || y === undefined) {
          return undefined;
        }
        open();
        const endX = ax(x), endY = ay(y);
        const arc = arcSegments(currentX, currentY, endX, endY, rx, ry,
          (degrees * Math.PI) / 180, largeArc, sweep);
        if (arc.length === 0) {
          if (currentX !== endX || currentY !== endY) {
            segments.push({ kind: 'L', x: endX, y: endY });
          }
        } else {
          for (const piece of arc) segments.push(piece);
        }
        currentX = endX; currentY = endY;
        clearControls();
        break;
      }
    }

    last = command;
  }

  // A lone move draws nothing, so a path that is only moves is as empty as no path at all.
  return segments.some((segment) => segment.kind !== 'M') ? segments : undefined;
}

function readAll(scanner: Scanner, count: number): number[] | undefined {
  const values: number[] = [];
  for (let index = 0; index < count; index++) {
    const value = scanner.nextNumber();
    if (value === undefined) return undefined;
    values.push(value);
  }
  return values;
}

/**
 * The previous control point mirrored through the current point.
 *
 * With no previous curve the specification says the control point coincides with the current
 * point, which makes a lone `S` behave like a plain cubic.
 */
function reflect(control: number | undefined, point: number): number {
  return control === undefined ? point : 2 * point - control;
}

/**
 * One SVG elliptical arc as cubic Béziers, following the SVG 1.1 notes (section F.6).
 *
 * Out of range radii are corrected the way the specification requires rather than rejected.
 */
function arcSegments(
  startX: number, startY: number, endX: number, endY: number,
  radiusX: number, radiusY: number, rotation: number,
  isLargeArc: boolean, isSweep: boolean,
): PathSegment[] {
  let rx = Math.abs(radiusX);
  let ry = Math.abs(radiusY);
  if (rx <= 0 || ry <= 0) return [];
  if (startX === endX && startY === endY) return [];

  const cosPhi = Math.cos(rotation);
  const sinPhi = Math.sin(rotation);
  const dx = (startX - endX) / 2;
  const dy = (startY - endY) / 2;
  const x1 = cosPhi * dx + sinPhi * dy;
  const y1 = -sinPhi * dx + cosPhi * dy;

  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) {
    const correction = Math.sqrt(lambda);
    rx *= correction;
    ry *= correction;
  }

  const denominator = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  if (denominator <= 0) return [];
  const numerator = Math.max(0, rx * rx * ry * ry - denominator);
  const coefficient = (isLargeArc === isSweep ? -1 : 1) * Math.sqrt(numerator / denominator);

  const cx1 = (coefficient * rx * y1) / ry;
  const cy1 = (-coefficient * ry * x1) / rx;
  const centerX = cosPhi * cx1 - sinPhi * cy1 + (startX + endX) / 2;
  const centerY = sinPhi * cx1 + cosPhi * cy1 + (startY + endY) / 2;

  const unitStartX = (x1 - cx1) / rx;
  const unitStartY = (y1 - cy1) / ry;
  const unitEndX = (-x1 - cx1) / rx;
  const unitEndY = (-y1 - cy1) / ry;

  const startAngle = angleBetween(1, 0, unitStartX, unitStartY);
  let sweep = angleBetween(unitStartX, unitStartY, unitEndX, unitEndY);
  if (!isSweep && sweep > 0) sweep -= 2 * Math.PI;
  else if (isSweep && sweep < 0) sweep += 2 * Math.PI;

  // The epsilon decides the split by the geometry rather than by the rounding: a 90 degree arc
  // divides to 1.0000000000000002 as often as to 0.999999999999999.
  const count = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 2) - 1e-9));
  const step = sweep / count;
  const controlScale = (4 / 3) * Math.tan(step / 4);

  const placedX = (x: number, y: number): number => cosPhi * (x * rx) - sinPhi * (y * ry) + centerX;
  const placedY = (x: number, y: number): number => sinPhi * (x * rx) + cosPhi * (y * ry) + centerY;

  const output: PathSegment[] = [];
  for (let index = 0; index < count; index++) {
    const from = startAngle + index * step;
    const to = from + step;
    const fx = Math.cos(from), fy = Math.sin(from);
    const tx = Math.cos(to), ty = Math.sin(to);

    const c1x = fx - controlScale * Math.sin(from);
    const c1y = fy + controlScale * Math.cos(from);
    const c2x = tx + controlScale * Math.sin(to);
    const c2y = ty - controlScale * Math.cos(to);

    output.push({
      kind: 'C',
      c1x: placedX(c1x, c1y), c1y: placedY(c1x, c1y),
      c2x: placedX(c2x, c2y), c2y: placedY(c2x, c2y),
      x: index === count - 1 ? endX : placedX(tx, ty),
      y: index === count - 1 ? endY : placedY(tx, ty),
    });
  }
  return output;
}

function angleBetween(ax: number, ay: number, bx: number, by: number): number {
  const dot = ax * bx + ay * by;
  const magnitude = Math.sqrt((ax * ax + ay * ay) * (bx * bx + by * by));
  if (magnitude <= 0) return 0;
  const sign = ax * by - ay * bx < 0 ? -1 : 1;
  return sign * Math.acos(Math.min(1, Math.max(-1, dot / magnitude)));
}
