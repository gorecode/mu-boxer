import { moves, type Fighter } from './model.ts';

export interface Box { left: number; bottom: number; right: number; top: number }
export interface Geometry { hurt: Box[]; hit: Box[] }
const box = (left: number, bottom: number, right: number, top: number): Box => ({ left, bottom, right, top });
export function overlaps(a: Box, b: Box): boolean {
  return a.left <= b.right && a.right >= b.left && a.bottom <= b.top && a.top >= b.bottom;
}
export function fighterGeometry(f: Fighter): Geometry {
  const low = f.crouch || f.action?.kind === 'low' || f.action?.kind === 'upper';
  const down = f.reaction === 'down';
  const hurt = down ? [box(-105, 0, 105, 85)] : low
    ? [box(-65, 0, 65, 155), box(-55, 155, 75, 265)]
    : [box(-65, 0, 65, 180), box(-65, 180, 65, 450), box(-45, 450, 50, 570)];
  const hit: Box[] = [];
  const a = f.action;
  if (a) {
    const m = moves[a.kind];
    if (a.time >= m.windup && a.time < m.windup + m.active) {
      const extension = m.range - 65;
      const heights: Record<string, [number, number]> = {
        jab: [430, 500], heavy: [260, 370], low: [15, 110], upper: [210, 455],
        poke: [330, 410], sweep: [0, 65], overhead: [240, 490],
      };
      const [bottom, top] = heights[a.kind];
      hit.push(box(55, bottom, extension, top));
      if (a.kind === 'jab' || a.kind === 'heavy') hurt.push(box(50, bottom, extension - 12, top));
    }
  }
  const world = (b: Box): Box => ({
    left: f.x + (f.facing === 1 ? b.left : -b.right), right: f.x + (f.facing === 1 ? b.right : -b.left),
    bottom: f.y + b.bottom, top: f.y + b.top,
  });
  return { hurt: hurt.map(world), hit: hit.map(world) };
}
