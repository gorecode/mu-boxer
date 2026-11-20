import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFight, idleInput, moves, pauseFight, resumeFight, startFight, stepFight, type Fight, type Input, type Attack } from '../src/fight/model.ts';

function advance(s: Fight, seconds: number, input: Partial<Input> = {}): void {
  for (let i = 0; i < Math.round(seconds * 120); i++) stepFight(s, { ...idleInput(), ...input }, 1 / 120);
}
function ready(): Fight {
  const s = createFight(); startFight(s); advance(s, 1.7); s.aiWait = 999;
  return s;
}
function duel(): Fight { const s = ready(); s.player.x = 600; s.worker.x = 800; return s; }
function incoming(s: Fight, kind: Attack): void {
  s.worker.action = { kind, time: moves[kind].windup - .01, connected: false };
}

test('fight starts inert, counts down without damage, then allows input; restart is a fresh match', () => {
  const s = createFight('warmup'); advance(s, 2, { right: true, heavy: true });
  assert.equal(s.phase, 'menu'); assert.equal(s.player.x, 430); assert.equal(s.remaining, 90);
  startFight(s); advance(s, 1, { right: true, heavy: true });
  assert.equal(s.phase, 'countdown'); assert.equal(s.player.x, 430); assert.equal(s.worker.hp, 120);
  advance(s, .7); assert.equal(s.phase, 'fighting');
  const fresh = createFight('warmup'); assert.equal(fresh.player.hp, 100); assert.equal(fresh.worker.hp, 120); assert.equal(fresh.hits, 0);
});

test('movement respects both walls and solid bodies; opposing movement cancels; ground jump cannot double-jump', () => {
  const s = ready(); advance(s, 3, { left: true }); assert.equal(s.player.x, 215);
  advance(s, 1, { left: true, right: true }); assert.equal(s.player.x, 215);
  s.worker.x = 900; advance(s, 4, { right: true }); assert.ok(Math.abs(s.player.x - s.worker.x) >= 139.99);
  s.player.x = 1300; s.worker.x = 1000; advance(s, 1, { right: true }); assert.equal(s.player.x, 1385);
  stepFight(s, { ...idleInput(), jump: true }, 1 / 120); const initialVy = s.player.vy;
  advance(s, .2, { jump: true }); assert.ok(s.player.y > 0); assert.ok(s.player.vy < initialVy);
  advance(s, 1); assert.equal(s.player.y, 0); assert.equal(s.player.vy, 0);
  const arc = ready(); stepFight(arc, { ...idleInput(), jump: true }, 1/120);
  let apex = 0;
  for (let i = 0; i < 150; i++) { stepFight(arc, idleInput(), 1/120); apex = Math.max(apex, arc.player.y); }
  assert.ok(apex > 245 && apex < 265); assert.equal(arc.player.y, 0);
});

test('jab has startup, range, facing, recovery and one contact per swing', () => {
  const s = duel(); advance(s, .07, { light: true }); assert.equal(s.worker.hp, 120);
  advance(s, .08); assert.equal(s.worker.hp, 112); assert.equal(s.hits, 1);
  advance(s, .1); assert.equal(s.worker.hp, 112);
  advance(s, .2); assert.equal(s.player.action, null);
  const distant = duel(); distant.worker.x = 1000; advance(distant, .5, { light: true }); assert.equal(distant.worker.hp, 120);
  const wrong = duel(); wrong.player.action = { kind: 'jab', time: .11, connected: false }; wrong.player.facing = -1;
  advance(wrong, .04); assert.equal(wrong.worker.hp, 120);
  const edge = duel(); edge.worker.x = edge.player.x + moves.jab.range; advance(edge, .15, { light: true }); assert.equal(edge.worker.hp, 112);
  const outside = duel(); outside.worker.x = outside.player.x + moves.jab.range + .1; advance(outside, .15, { light: true }); assert.equal(outside.worker.hp, 120);
});

test('heavy and crouching attacks have distinct damage and recovery contracts', () => {
  for (const [input, damage, kind] of [
    [{ heavy: true }, 20, 'heavy'], [{ down: true, light: true }, 10, 'low'], [{ down: true, heavy: true }, 23, 'upper'],
  ] as const) {
    const s = duel(); advance(s, .35, input); assert.equal(s.worker.hp, 120 - damage, kind); assert.equal(s.player.action?.kind, kind);
  }
});

test('standing block stops high but not low; crouching block stops sweep but not overhead; no rear block', () => {
  for (const [kind, down, damage] of [['poke', false, 0], ['sweep', false, 17], ['sweep', true, 0], ['overhead', true, 22], ['overhead', false, 0]] as const) {
    const s = duel(); incoming(s, kind); advance(s, .05, { block: true, down });
    assert.equal(s.player.hp, 100 - damage, `${kind}, crouch=${down}`);
    if (!damage) { assert.equal(s.blocked, 1); assert.ok(s.player.guard < 100); }
  }
  const behind = duel(); behind.player.action = { kind: 'jab', time: 0, connected: false }; behind.player.facing = -1; incoming(behind, 'poke');
  advance(behind, .05, { block: true }); assert.equal(behind.player.hp, 88);
});

test('duck evades a high poke, jumping clears a sweep, and out-of-range attacks do no damage', () => {
  const duck = duel(); incoming(duck, 'poke'); advance(duck, .07, { down: true }); assert.equal(duck.player.hp, 100);
  const jump = duel(); jump.player.y = 90; jump.player.vy = 120; incoming(jump, 'sweep'); advance(jump, .07); assert.equal(jump.player.hp, 100);
  const far = duel(); far.worker.x = 1200; incoming(far, 'overhead'); advance(far, .07); assert.equal(far.player.hp, 100);
});

test('depleted guard breaks, cancels block and prevents immediate retaliation; guard recovers at rest', () => {
  const s = duel(); s.player.guard = 3; incoming(s, 'poke'); advance(s, .04, { block: true });
  assert.equal(s.player.hp, 100); assert.equal(s.player.guard, 0); assert.ok(s.player.stun > .7); assert.equal(s.player.blocking, false);
  advance(s, .15, { heavy: true }); assert.equal(s.player.action, null);
  advance(s, 1.1); assert.ok(s.player.guard > 20);
});

test('hit interrupts startup, grants bounded immunity and briefly freezes both fighters', () => {
  const s = duel(); s.player.action = { kind: 'heavy', time: .01, connected: false }; incoming(s, 'poke');
  advance(s, .03); assert.equal(s.player.action, null); assert.equal(s.player.hp, 88); assert.ok(s.hitstop > 0);
  const remaining = s.remaining; advance(s, .02); assert.equal(s.remaining, remaining);
  incoming(s, 'poke'); advance(s, .08); assert.equal(s.player.hp, 88);
  advance(s, .5); incoming(s, 'poke'); advance(s, .05); assert.equal(s.player.hp, 76);
});

test('pause freezes timer, physics and startup; resume requires explicit action', () => {
  const s = duel(); advance(s, .05, { heavy: true }); pauseFight(s);
  const before = JSON.stringify({ player: s.player, worker: s.worker, remaining: s.remaining });
  advance(s, 3, { right: true, light: true }); assert.equal(s.phase, 'paused');
  assert.equal(JSON.stringify({ player: s.player, worker: s.worker, remaining: s.remaining }), before);
  resumeFight(s); advance(s, .4); assert.equal(s.worker.hp, 100);
  const countdown = createFight(); startFight(countdown); pauseFight(countdown); resumeFight(countdown); assert.equal(countdown.phase, 'countdown');
});

test('AI approaches and uses different attacks; warmup reduces incoming damage', () => {
  const s = ready(); s.aiWait = 0; const kinds = new Set<string>();
  for (let i = 0; i < 120*9; i++) { stepFight(s, { ...idleInput(), block: true }, 1/120); if (s.worker.action) kinds.add(s.worker.action.kind); }
  assert.ok(s.worker.x < 1170); assert.ok(kinds.has('poke')); assert.ok(kinds.has('sweep'));
  const easy = duel(); easy.difficulty = 'warmup'; incoming(easy, 'poke'); advance(easy, .05); assert.equal(easy.player.hp, 92);
});

test('actual attacks can win and lose; terminal states freeze; timeout compares health fractions and supports draw', () => {
  const win = duel(); win.worker.hp = 8; advance(win, .3, { light: true }); assert.equal(win.phase, 'win');
  assert.equal(win.worker.hp, 0); const remaining = win.remaining; advance(win, 2, { light: true }); assert.equal(win.remaining, remaining);
  const loss = duel(); loss.player.hp = 12; incoming(loss, 'poke'); advance(loss, .1); assert.equal(loss.phase, 'loss'); assert.equal(loss.player.hp, 0);
  for (const [hp, enemyHp, expected] of [[80, 60, 'win'], [40, 96, 'loss'], [50, 60, 'draw']] as const) {
    const s = duel(); s.player.hp = hp; s.worker.hp = enemyHp; s.remaining = .01; advance(s, .03); assert.equal(s.phase, expected); assert.equal(s.remaining, 0);
  }
});

test('simulation rejects invalid time and a zero step changes no combat state', () => {
  const s = duel();
  for (const dt of [NaN, Infinity, -.1, .051]) assert.throws(() => stepFight(s, idleInput(), dt), RangeError);
  const before = JSON.stringify(s); stepFight(s, idleInput(), 0); assert.equal(JSON.stringify(s), before);
});
