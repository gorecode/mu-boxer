import { celAt, crouching, standing, type Box } from './moves.ts';
import type { Fighter } from './model.ts';
export type { Box } from './moves.ts';
export interface Geometry { hurt: Box[]; hit: Box[] }
export function overlaps(a: Box, b: Box): boolean {
  return a.left <= b.right && a.right >= b.left && a.bottom <= b.top && a.top >= b.bottom;
}
export function fighterGeometry(f: Fighter): Geometry {
  const cel = f.action ? celAt(f.action.kind, f.action.time).cel : null;
  const hurt = f.reaction === 'down' ? [{ left: -105, bottom: 0, right: 105, top: 85 }]
    : cel?.hurt ?? (f.crouch ? crouching : standing);
  const world = (b: Box): Box => ({
    left: f.x + (f.facing === 1 ? b.left : -b.right), right: f.x + (f.facing === 1 ? b.right : -b.left),
    bottom: f.y + b.bottom, top: f.y + b.top,
  });
  return { hurt: hurt.map(world), hit: (cel?.hit ?? []).map(world) };
}
