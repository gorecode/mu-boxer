export type Attack = 'jab' | 'heavy' | 'low' | 'upper' | 'poke' | 'sweep' | 'overhead';
export type Phase = 'menu' | 'countdown' | 'fighting' | 'paused' | 'win' | 'loss' | 'draw';
export type Difficulty = 'warmup' | 'street';
export interface Input { left: boolean; right: boolean; down: boolean; block: boolean; jump: boolean; light: boolean; heavy: boolean }
export const idleInput = (): Input => ({ left: false, right: false, down: false, block: false, jump: false, light: false, heavy: false });
export interface Move { windup: number; active: number; recovery: number; range: number; damage: number; level: 'high' | 'mid' | 'low' | 'overhead'; push: number }
export const moves: Record<Attack, Move> = {
  jab: { windup: .1, active: .09, recovery: .18, range: 215, damage: 8, level: 'mid', push: 18 },
  heavy: { windup: .25, active: .12, recovery: .36, range: 250, damage: 20, level: 'mid', push: 60 },
  low: { windup: .17, active: .1, recovery: .3, range: 235, damage: 10, level: 'low', push: 25 },
  upper: { windup: .2, active: .12, recovery: .4, range: 200, damage: 23, level: 'overhead', push: 55 },
  poke: { windup: .4, active: .12, recovery: .42, range: 320, damage: 12, level: 'high', push: 38 },
  sweep: { windup: .65, active: .14, recovery: .62, range: 345, damage: 17, level: 'low', push: 65 },
  overhead: { windup: .76, active: .12, recovery: .66, range: 280, damage: 22, level: 'overhead', push: 65 },
};
export interface Fighter {
  x: number; y: number; vy: number; velocity: number; facing: 1 | -1;
  hp: number; maxHp: number; guard: number; crouch: boolean; blocking: boolean;
  stun: number; invulnerable: number; action: { kind: Attack; time: number; connected: boolean } | null;
  travel: number; hurt: number;
}
export interface FightEvent { type: 'hit' | 'block' | 'break' | 'miss' | 'jump' | 'land' | 'start' | 'finish'; target: 'player' | 'worker'; x: number; y: number; power: number }
export interface Fight {
  phase: Phase; resume: 'countdown' | 'fighting'; difficulty: Difficulty;
  player: Fighter; worker: Fighter; time: number; remaining: number; countdown: number;
  hitstop: number; aiWait: number; aiTurn: number; combo: number; comboTime: number;
  hits: number; blocked: number; events: FightEvent[];
}
function fighter(x: number, hp: number, facing: 1 | -1): Fighter {
  return { x, y: 0, vy: 0, velocity: 0, facing, hp, maxHp: hp, guard: 100, crouch: false, blocking: false,
    stun: 0, invulnerable: 0, action: null, travel: 0, hurt: 0 };
}
export function createFight(difficulty: Difficulty = 'street'): Fight {
  return { phase: 'menu', resume: 'countdown', difficulty, player: fighter(430, 100, 1), worker: fighter(1170, 120, -1),
    time: 0, remaining: 90, countdown: 1.6, hitstop: 0, aiWait: .65, aiTurn: 0, combo: 0, comboTime: 0, hits: 0, blocked: 0, events: [] };
}
export function startFight(fight: Fight): void { if (fight.phase === 'menu') fight.phase = 'countdown'; }
export function pauseFight(fight: Fight): void {
  if (fight.phase === 'fighting' || fight.phase === 'countdown') {
    fight.resume = fight.phase; fight.phase = 'paused';
    for (const f of [fight.player, fight.worker]) { f.blocking = false; f.velocity = 0; }
  }
}
export function resumeFight(fight: Fight): void { if (fight.phase === 'paused') fight.phase = fight.resume; }
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
function emit(s: Fight, type: FightEvent['type'], target: 'player' | 'worker', power = 0): void {
  const f = s[target]; s.events.push({ type, target, x: f.x, y: f.y, power });
}
function begin(f: Fighter, kind: Attack): void {
  if (!f.action && f.stun <= 0) { f.action = { kind, time: 0, connected: false }; f.blocking = false; f.velocity = 0; }
}
function body(f: Fighter, dt: number, s: Fight, name: 'player' | 'worker'): void {
  f.stun = Math.max(0, f.stun - dt); f.invulnerable = Math.max(0, f.invulnerable - dt); f.hurt = Math.max(0, f.hurt - dt);
  f.guard = clamp(f.guard + dt * (f.blocking ? 5 : 27), 0, 100);
  if (f.y > 0 || f.vy > 0) {
    f.vy -= 1750 * dt; f.y = Math.max(0, f.y + f.vy * dt);
    if (f.y === 0) { f.vy = 0; emit(s, 'land', name); }
  }
  if (f.action) {
    f.action.time += dt;
    const m = moves[f.action.kind];
    if (f.action.time >= m.windup + m.active + m.recovery) {
      if (!f.action.connected) emit(s, 'miss', name);
      f.action = null;
    }
  }
}
function move(f: Fighter, velocity: number, dt: number): void {
  f.velocity = velocity;
  const before = f.x; f.x = clamp(f.x + velocity * dt, 215, 1385); f.travel += Math.abs(f.x - before);
}
function control(s: Fight, input: Input, dt: number): void {
  const p = s.player;
  p.crouch = input.down && p.y === 0 && p.stun <= 0;
  p.blocking = input.block && p.y === 0 && !p.action && p.stun <= 0;
  if (p.stun > 0) { p.blocking = false; p.crouch = false; move(p, 0, dt); return; }
  if (input.jump && p.y === 0 && !p.action && !p.blocking) { p.vy = 950; p.y = .1; p.crouch = false; emit(s, 'jump', 'player'); }
  if (!p.blocking) {
    if (input.heavy) begin(p, p.crouch ? 'upper' : 'heavy');
    else if (input.light) begin(p, p.crouch ? 'low' : 'jab');
  }
  const direction = Number(input.right) - Number(input.left);
  move(p, p.action || p.blocking || p.crouch ? 0 : direction * (p.y > 0 ? 245 : 355), dt);
}
function ai(s: Fight, dt: number): void {
  const w = s.worker, p = s.player, distance = Math.abs(p.x - w.x);
  w.blocking = false; w.crouch = false; w.velocity = 0;
  if (w.action || w.stun > 0) return;
  s.aiWait -= dt;
  const sign = Math.sign(p.x - w.x);
  if (distance > 280) move(w, sign * (s.difficulty === 'warmup' ? 115 : 160), dt);
  else if (distance < 165 && s.aiWait > .15) move(w, -sign * 100, dt);
  if (p.action && distance < 280 && s.aiTurn % 4 === 3 && s.aiWait > .15) {
    w.blocking = true; w.crouch = p.action.kind === 'low';
  }
  if (s.aiWait <= 0 && distance <= 340) {
    const pattern: Attack[] = ['poke', 'sweep', 'poke', 'overhead', 'sweep', 'overhead'];
    begin(w, pattern[s.aiTurn % pattern.length]); s.aiTurn++;
    s.aiWait = s.difficulty === 'warmup' ? 1.2 : .46;
  }
}
function contact(s: Fight, from: 'player' | 'worker', to: 'player' | 'worker'): void {
  const a = s[from], b = s[to], attack = a.action;
  if (!attack || attack.connected || b.hp <= 0 || b.invulnerable > 0) return;
  const m = moves[attack.kind];
  if (attack.time < m.windup || attack.time >= m.windup + m.active) return;
  if (Math.abs(a.x - b.x) > m.range || (b.x - a.x) * a.facing <= 0) return;
  if (m.level === 'low' && b.y > 55 || m.level === 'high' && b.crouch || Math.abs(a.y - b.y) > 210) return;
  attack.connected = true;
  const facingAttacker = (a.x - b.x) * b.facing > 0;
  const defended = b.blocking && facingAttacker && (m.level === 'low' ? b.crouch : m.level === 'overhead' ? !b.crouch : true);
  if (defended) {
    b.guard = Math.max(0, b.guard - (m.damage + 13));
    s.blocked += to === 'player' ? 1 : 0;
    if (b.guard === 0) {
      b.blocking = false; b.stun = .8; b.action = null; b.hurt = .35;
      emit(s, 'break', to, m.damage); s.hitstop = .065;
    } else { emit(s, 'block', to, m.damage); s.hitstop = .035; }
    b.x = clamp(b.x + a.facing * 14, 215, 1385);
    return;
  }
  const damage = from === 'worker' && s.difficulty === 'warmup' ? Math.ceil(m.damage * .65) : m.damage;
  b.hp = Math.max(0, b.hp - damage); b.stun = from === 'worker' ? .36 : .22;
  b.hurt = .28; b.invulnerable = .19; b.action = null; b.blocking = false;
  b.x = clamp(b.x + a.facing * m.push, 215, 1385);
  if (to === 'worker') { s.hits++; s.combo = s.comboTime > 0 ? s.combo + 1 : 1; s.comboTime = 1.05; }
  emit(s, 'hit', to, damage); s.hitstop = m.damage >= 17 ? .075 : .045;
}
function separate(s: Fight): void {
  const p = s.player, w = s.worker, delta = w.x - p.x;
  if (Math.abs(delta) < 140 && Math.abs(p.y - w.y) < 125) {
    const direction = delta >= 0 ? 1 : -1, middle = clamp((p.x + w.x) / 2, 285, 1315);
    p.x = middle - direction * 70; w.x = middle + direction * 70;
  }
  for (const [f, other] of [[p, w], [w, p]]) if (!f.action) f.facing = other.x >= f.x ? 1 : -1;
}
function finish(s: Fight): void {
  const p = s.player, w = s.worker;
  if (p.hp > 0 && w.hp > 0 && s.remaining > 0) return;
  const delta = p.hp / p.maxHp - w.hp / w.maxHp;
  s.phase = delta > 0 ? 'win' : delta < 0 ? 'loss' : 'draw';
  for (const f of [p, w]) { f.action = null; f.blocking = false; f.velocity = 0; f.y = 0; f.vy = 0; f.crouch = false; }
  emit(s, 'finish', s.phase === 'win' ? 'worker' : 'player');
}
export function stepFight(s: Fight, input: Input, dt: number): void {
  if (!Number.isFinite(dt) || dt < 0 || dt > .05) throw new RangeError('Fight step must be between 0 and 50 ms');
  s.events = [];
  if (!dt || s.phase === 'menu' || s.phase === 'paused' || s.phase === 'win' || s.phase === 'loss' || s.phase === 'draw') return;
  if (s.phase === 'countdown') {
    s.countdown = Math.max(0, s.countdown - dt);
    if (!s.countdown) { s.phase = 'fighting'; emit(s, 'start', 'player'); }
    return;
  }
  if (s.hitstop > 0) { s.hitstop = Math.max(0, s.hitstop - dt); return; }
  s.time += dt; s.remaining = Math.max(0, s.remaining - dt); s.comboTime = Math.max(0, s.comboTime - dt);
  body(s.player, dt, s, 'player'); body(s.worker, dt, s, 'worker');
  control(s, input, dt); ai(s, dt); separate(s);
  contact(s, 'player', 'worker'); contact(s, 'worker', 'player'); separate(s); finish(s);
}
