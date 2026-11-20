import { fighterGeometry, overlaps } from './geometry.ts';

export type Attack = 'jab' | 'heavy' | 'low' | 'upper' | 'poke' | 'sweep' | 'overhead';
export type Phase = 'menu' | 'countdown' | 'fighting' | 'paused' | 'win' | 'loss' | 'draw';
export type Difficulty = 'warmup' | 'street';
export interface Input { left: boolean; right: boolean; down: boolean; block: boolean; jump: boolean; light: boolean; heavy: boolean; attackPressed?: 'jab' | 'heavy' | 'low' | 'upper' }
export const idleInput = (): Input => ({ left: false, right: false, down: false, block: false, jump: false, light: false, heavy: false });
export interface Move { windup: number; active: number; recovery: number; range: number; damage: number; level: 'high' | 'mid' | 'low' | 'overhead'; push: number; hitstun: number; stop: [number, number]; reaction: 'light' | 'heavy' | 'launch' | 'down'; lift: number }
export const moves: Record<Attack, Move> = {
  jab: { windup: .1, active: .09, recovery: .18, range: 320, damage: 8, level: 'mid', push: 18, hitstun: .4, stop: [.04, .065], reaction: 'light', lift: 0 },
  heavy: { windup: .25, active: .12, recovery: .36, range: 250, damage: 20, level: 'mid', push: 60, hitstun: .42, stop: [.065, .09], reaction: 'heavy', lift: 0 },
  low: { windup: .17, active: .1, recovery: .3, range: 235, damage: 10, level: 'low', push: 25, hitstun: .38, stop: [.04, .065], reaction: 'light', lift: 0 },
  upper: { windup: .2, active: .12, recovery: .4, range: 250, damage: 23, level: 'overhead', push: 55, hitstun: .6, stop: [.07, .10], reaction: 'launch', lift: 620 },
  poke: { windup: .4, active: .12, recovery: .42, range: 320, damage: 12, level: 'high', push: 38, hitstun: .36, stop: [.045, .07], reaction: 'light', lift: 0 },
  sweep: { windup: .65, active: .14, recovery: .62, range: 345, damage: 17, level: 'low', push: 65, hitstun: .65, stop: [.055, .085], reaction: 'down', lift: 0 },
  overhead: { windup: .76, active: .12, recovery: .66, range: 280, damage: 22, level: 'overhead', push: 65, hitstun: .5, stop: [.075, .1], reaction: 'heavy', lift: 0 },
};
export interface Fighter {
  x: number; y: number; vy: number; velocity: number; facing: 1 | -1;
  hp: number; maxHp: number; guard: number; crouch: boolean; blocking: boolean;
  stun: number; invulnerable: number; action: { kind: Attack; time: number; connected: boolean; result?: 'hit' | 'block'; chain?: number } | null;
  travel: number; hurt: number; stop: number; knockback: number; reaction: Move['reaction'] | 'guard' | null;
}
export interface FightEvent { type: 'hit' | 'block' | 'break' | 'miss' | 'jump' | 'land' | 'start' | 'finish'; target: 'player' | 'worker'; x: number; y: number; power: number; attack?: Attack; direction?: number }
export interface Fight {
  phase: Phase; resume: 'countdown' | 'fighting'; difficulty: Difficulty;
  player: Fighter; worker: Fighter; time: number; remaining: number; countdown: number;
  hitstop: number; aiWait: number; aiTurn: number; combo: number; comboTime: number;
  hits: number; blocked: number; events: FightEvent[];
  held: Input; buffered: { kind: Attack | 'jump'; remaining: number } | null; comboActive: boolean;
}
function fighter(x: number, hp: number, facing: 1 | -1): Fighter {
  return { x, y: 0, vy: 0, velocity: 0, facing, hp, maxHp: hp, guard: 100, crouch: false, blocking: false,
    stun: 0, invulnerable: 0, action: null, travel: 0, hurt: 0, stop: 0, knockback: 0, reaction: null };
}
export function createFight(difficulty: Difficulty = 'street'): Fight {
  return { phase: 'menu', resume: 'countdown', difficulty, player: fighter(430, 100, 1), worker: fighter(1170, 120, -1),
    time: 0, remaining: 90, countdown: 1.6, hitstop: 0, aiWait: .65, aiTurn: 0, combo: 0, comboTime: 0, hits: 0, blocked: 0, events: [], held: idleInput(), buffered: null, comboActive: false };
}
export function startFight(fight: Fight): void { if (fight.phase === 'menu') fight.phase = 'countdown'; }
export function pauseFight(fight: Fight): void {
  if (fight.phase === 'fighting' || fight.phase === 'countdown') {
    fight.resume = fight.phase; fight.phase = 'paused'; fight.buffered = null; fight.held = idleInput();
    for (const f of [fight.player, fight.worker]) { f.blocking = false; f.velocity = 0; }
  }
}
export function resumeFight(fight: Fight): void { if (fight.phase === 'paused') fight.phase = fight.resume; }
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
function emit(s: Fight, type: FightEvent['type'], target: 'player' | 'worker', power = 0): void {
  const f = s[target]; s.events.push({ type, target, x: f.x, y: f.y, power });
}
function begin(f: Fighter, kind: Attack): void {
  if (!f.action && f.stun <= 0 && !f.reaction) { f.action = { kind, time: 0, connected: false }; f.blocking = false; f.velocity = 0; }
}
function body(f: Fighter, dt: number, s: Fight, name: 'player' | 'worker'): boolean {
  if (f.stop > 0) { f.stop = Math.max(0, f.stop - dt); return false; }
  f.stun = Math.max(0, f.stun - dt); f.invulnerable = Math.max(0, f.invulnerable - dt); f.hurt = Math.max(0, f.hurt - dt);
  f.guard = clamp(f.guard + dt * (f.blocking ? 5 : 27), 0, 100);
  if (f.y > 0 || f.vy > 0) {
    f.vy -= 1750 * dt; f.y = Math.max(0, f.y + f.vy * dt);
    if (f.y === 0) { f.vy = 0; emit(s, 'land', name); }
  }
  if (f.knockback) {
    move(f, f.knockback, dt); f.knockback *= Math.exp(-dt * 12);
    if (Math.abs(f.knockback) < 1) f.knockback = 0;
  }
  if (f.stun <= 0 && f.y === 0) f.reaction = null;
  if (f.action) {
    f.action.time += dt;
    const m = moves[f.action.kind];
    if (f.action.time >= m.windup + m.active + m.recovery) {
      if (!f.action.connected) emit(s, 'miss', name);
      f.action = null;
    }
  }
  return true;
}
function move(f: Fighter, velocity: number, dt: number): void {
  f.velocity = velocity;
  const before = f.x; f.x = clamp(f.x + velocity * dt, 215, 1385); f.travel += Math.abs(f.x - before);
}
const BUFFER_TIME = .12;
function readInput(s: Fight, input: Input, dt: number): void {
  if (s.buffered && s.player.stop <= 0) {
    s.buffered.remaining -= dt;
    if (s.buffered.remaining <= 0) s.buffered = null;
  }
  let kind: Attack | 'jump' | undefined;
  if (input.jump && !s.held.jump) kind = 'jump';
  const crouch = input.down && s.player.y === 0;
  if (input.light && !s.held.light) kind = crouch ? 'low' : 'jab';
  if (input.heavy && !s.held.heavy) kind = crouch ? 'upper' : 'heavy';
  if (input.attackPressed) kind = input.attackPressed;
  if (kind) s.buffered = { kind, remaining: BUFFER_TIME };
  s.held = { ...input };
}
function control(s: Fight, input: Input, dt: number): void {
  const p = s.player;
  p.crouch = input.down && p.y === 0 && p.stun <= 0 && !p.reaction;
  p.blocking = input.block && p.y === 0 && !p.action && p.stun <= 0 && !p.reaction;
  if (p.stun > 0 || p.reaction) { p.blocking = false; p.crouch = false; return; }
  const requested = s.buffered?.kind;
  if (requested && !p.blocking) {
    if (requested === 'jump') {
      if (p.y === 0 && !p.action) {
        p.vy = 950; p.y = .1; p.crouch = false; emit(s, 'jump', 'player'); s.buffered = null;
      }
    } else {
      const a = p.action;
      const allowed: Partial<Record<Attack, Attack[]>> = { jab: ['heavy'], heavy: ['upper'], low: ['upper'] };
      const cancel = a?.result === 'hit' && (a.chain ?? 0) < 2 &&
        a.time <= moves[a.kind].windup + moves[a.kind].active + .12 && allowed[a.kind]?.includes(requested);
      if (!a || cancel) {
        const chain = cancel && a ? (a.chain ?? 0) + 1 : 0;
        p.action = { kind: requested, time: 0, connected: false, chain };
        p.blocking = false; p.velocity = 0; s.buffered = null;
      }
    }
  }
  const direction = Number(input.right) - Number(input.left);
  const follow = p.action && (p.action.chain ?? 0) > 0 && p.action.time < .08;
  move(p, follow ? p.facing * 300 : p.action || p.blocking || p.crouch ? 0 : direction * (p.y > 0 ? 245 : 355), dt);
}
function ai(s: Fight, dt: number): void {
  const w = s.worker, p = s.player, distance = Math.abs(p.x - w.x);
  w.blocking = false; w.crouch = false; w.velocity = 0;
  if (w.action || w.stun > 0 || w.reaction) return;
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
interface Contact {
  from: 'player' | 'worker'; to: 'player' | 'worker'; kind: Attack; direction: 1 | -1;
  defended: boolean; chain: number; continuing: boolean; x: number; y: number;
}
function contact(s: Fight, from: Contact['from'], to: Contact['to']): Contact | null {
  const a = s[from], b = s[to], attack = a.action;
  if (!attack || attack.connected || a.stop > 0 || b.hp <= 0 || b.invulnerable > 0) return null;
  const geometry = fighterGeometry(a), target = fighterGeometry(b);
  const hit = geometry.hit.find(h => target.hurt.some(b => overlaps(h, b)));
  if (!hit) return null;
  const m = moves[attack.kind];
  const facingAttacker = (a.x - b.x) * b.facing > 0;
  const defended = b.blocking && facingAttacker && (m.level === 'low' ? b.crouch : m.level === 'overhead' ? !b.crouch : true);
  const hurt = target.hurt.find(b => overlaps(hit, b))!;
  return { from, to, kind: attack.kind, direction: a.facing, defended, chain: attack.chain ?? 0,
    continuing: s.comboActive && b.stun > 0, x: (Math.max(hit.left, hurt.left) + Math.min(hit.right, hurt.right)) / 2,
    y: (Math.max(hit.bottom, hurt.bottom) + Math.min(hit.top, hurt.top)) / 2 };
}
function applyContact(s: Fight, c: Contact): void {
  const a = s[c.from], b = s[c.to], m = moves[c.kind];
  if (a.action) { a.action.connected = true; a.action.result = c.defended ? 'block' : 'hit'; }
  const event = (type: FightEvent['type'], power: number) => s.events.push({
    type, target: c.to, x: c.x, y: c.y, power, attack: c.kind, direction: c.direction,
  });
  if (c.defended) {
    b.guard = Math.max(0, b.guard - (m.damage + 13));
    s.blocked += c.to === 'player' ? 1 : 0;
    if (b.guard === 0) {
      b.blocking = false; b.stun = .8; b.action = null; b.hurt = .35; b.reaction = 'heavy';
      event('break', m.damage);
    } else { b.stun = .12; b.reaction = 'guard'; event('block', m.damage); }
    a.stop = Math.max(a.stop, .025); b.stop = Math.max(b.stop, .04);
    b.knockback = c.direction * 140;
    return;
  }
  const damage = Math.ceil(m.damage * (c.from === 'worker' && s.difficulty === 'warmup' ? .65 : 1) * (1 - c.chain * .15));
  b.hp = Math.max(0, b.hp - damage); b.stun = m.hitstun;
  b.hurt = .28; b.invulnerable = .19; b.action = null; b.blocking = false; b.crouch = false;
  b.reaction = m.reaction; b.knockback = c.direction * m.push * 12;
  if (m.lift) { b.vy = m.lift; b.y = Math.max(.1, b.y); }
  a.stop = Math.max(a.stop, m.stop[0]); b.stop = Math.max(b.stop, m.stop[1]);
  if (c.to === 'worker') {
    s.hits++; s.combo = c.continuing ? s.combo + 1 : 1; s.comboTime = 1.05; s.comboActive = true;
  } else { s.comboActive = false; s.combo = 0; }
  event('hit', damage);
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
  for (const f of [p, w]) { f.action = null; f.blocking = false; f.velocity = 0; f.y = 0; f.vy = 0; f.crouch = false; f.stop = 0; f.knockback = 0; f.reaction = null; }
  s.buffered = null; s.held = idleInput(); s.hitstop = 0;
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
  readInput(s, input, dt);
  const frozen = s.hitstop > 0;
  s.hitstop = Math.max(0, s.hitstop - dt);
  if (!frozen) { s.time += dt; s.remaining = Math.max(0, s.remaining - dt); s.comboTime = Math.max(0, s.comboTime - dt); }
  const playerReady = body(s.player, dt, s, 'player'), workerReady = body(s.worker, dt, s, 'worker');
  if (s.worker.stun <= 0 && s.worker.stop <= 0) s.comboActive = false;
  if (playerReady) control(s, input, dt);
  if (workerReady) ai(s, dt);
  separate(s);
  const contacts = [contact(s, 'player', 'worker'), contact(s, 'worker', 'player')];
  for (const c of contacts) if (c) applyContact(s, c);
  s.hitstop = Math.max(s.player.stop, s.worker.stop);
  separate(s); finish(s);
}
