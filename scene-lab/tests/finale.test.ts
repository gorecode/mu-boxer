import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenes } from '../src/scenes.ts';
import { cueAt, sceneImages, visualAt } from '../src/scene.ts';
import { subtitleAt } from '../src/speech.ts';

const bandit = scenes.find(scene => scene.id === 'bandit')!;
const epilogue = scenes.find(scene => scene.id === 'epilogue')!;
const cue = (id: string) => bandit.cues.find(cue => cue.id === id)!;

test('final chapters replace the controller ending with a brief lunch, recognition and unanswered threat', () => {
  assert.deepEqual(scenes.slice(-3).map(scene => scene.id), ['queue', 'bandit', 'epilogue']);
  assert.equal(bandit.duration, 27700);
  assert.equal(epilogue.duration, 39000);
  assert.equal(bandit.opponent, 'Бандита');
  assert.equal(sceneImages(bandit).length, 6);
  assert.equal(sceneImages(epilogue).length, 9);
  assert.deepEqual(bandit.cues.filter(cue => cue.text).map(cue => cue.text), [
    'Наконец я добрался до окошка.', 'Я пошёл к начальнику.', 'Ты?! Как ты здесь…',
    'На этот раз ты сядешь надолго.', 'Там не ответят.', 'Тогда я разберусь с тобой по-своему.',
  ]);
  for (const scene of [bandit, epilogue]) {
    for (const spoken of scene.cues.filter(cue => cue.text)) {
      assert.ok(spoken.duration - spoken.speech.duration >= 400, spoken.id);
      assert.equal(subtitleAt(spoken.speech, spoken.duration - 1), spoken.text);
    }
  }
});

test('the queue aftermath settles before silent lunch reading and the chief reveal never precedes the door', () => {
  const close = visualAt(bandit, 350), middle = visualAt(bandit, 1000), full = visualAt(bandit, 2100);
  assert.ok(close.camera.scale > middle.camera.scale && middle.camera.scale > full.camera.scale);
  assert.equal(full.camera.scale, 1);
  assert.equal(close.image, full.image);
  assert.ok(cue('queue-aftermath').end - Math.max(2100, cue('queue-aftermath').speech.duration) >= 800);
  assert.deepEqual(visualAt(bandit, 3999), full);
  assert.equal(cue('lunch').speech.duration, 0);
  assert.equal(cue('lunch').duration, 1600);
  assert.ok(cue('recognition').duration >= 600);
  assert.equal(cue('recognition').end, cue('question').start);
  for (const [at, image] of [[3999, 'queue-v2'], [4000, 'queue-v2'], [5600, 'door-v1'],
    [8599, 'door-v1'], [8600, 'office-v2']] as const) {
    assert.match(visualAt(bandit, at).image, new RegExp(`bandit-${image}.webp$`));
  }
});

test('phone states distinguish outgoing unanswered calls, a knowing answer and a receiver back on the base', () => {
  assert.deepEqual(bandit.events.filter(event => event.sound === 'ringback'), [
    { time: 15250, sound: 'ringback' }, { time: 16250, sound: 'ringback' },
  ]);
  assert.equal(bandit.events.some(event => event.sound === 'ring'), false);
  assert.match(visualAt(bandit, cue('unanswered').start).image, /bandit-phone-v1.webp$/);
  assert.match(visualAt(bandit, cue('no-answer').end - 1).image, /bandit-phone-v1.webp$/);
  assert.match(visualAt(bandit, cue('hang-up').start).image, /bandit-office-v2.webp$/);
  assert.equal(cue('hang-up').speech.duration, 0);
  assert.ok(cue('hang-up').duration >= 500);
  assert.equal(cue('personal').start, cue('hang-up').end);
  assert.equal(cue('prison').voice, 'officer');
  assert.equal(cue('no-answer').voice, 'boxer');
});

test('thought, anger and the final pose have distinct boundaries and a synchronized title flash', () => {
  assert.equal(cue('processing').end, cue('anger').start);
  assert.equal(cue('anger').end, cue('fight-flash').start);
  assert.match(visualAt(bandit, cue('processing').start).image, /office-v2.webp$/);
  assert.match(visualAt(bandit, 25199).image, /angry-v1.webp$/);
  assert.equal(cueAt(bandit, 25199).fight, undefined);
  assert.match(visualAt(bandit, 25200).image, /final-v1.webp$/);
  assert.equal(cueAt(bandit, 25200).fight, true);
  assert.equal(cueAt(bandit, 25200).flash, true);
  assert.equal(cueAt(bandit, 25319).flash, true);
  assert.equal(cueAt(bandit, 25320).flash, undefined);
  assert.deepEqual(cue('fight-flash').sounds, [{ at: 0, sound: 'impact' }]);
  for (const id of ['question', 'prison', 'personal', 'processing', 'anger']) {
    const bounds = ['prison', 'personal'].includes(id) ? [.66, .76, .23, .37] : [.16, .25, .19, .35];
    const { scale, x, y } = cue(id).camera;
    assert.ok(bounds[0] * scale - x / 100 * (scale - 1) >= .02, id);
    assert.ok(bounds[1] * scale - x / 100 * (scale - 1) <= .98, id);
    assert.ok(bounds[2] * scale - y / 100 * (scale - 1) >= .15, id);
    assert.ok(bounds[3] * scale - y / 100 * (scale - 1) <= .72, id);
  }
});

test('the epilogue preserves the author words and ordinary victims contradict the solemn accusation', () => {
  assert.deepEqual(epilogue.cues.filter(cue => cue.text).map(cue => cue.text), [
    'Сегодня свой турнир по боксу я выиграл.', 'И завтра выиграю районный.', 'Но…',
    'Этот город прогнил насквозь.', 'Все эти люди.', 'Продажные чиновники.', 'Судьи.', 'Бандиты.',
    'Этому городу нужен новый герой.', 'Который научит ценить и уважать закон…', 'И порядок.',
  ]);
  for (const [id, image] of [['people', 'worker-wide-v2'], ['officials', 'precinct-idle'],
    ['judges', 'intro-court-v2'], ['bandits', 'animator-wide-v2']]) {
    const current = epilogue.cues.find(cue => cue.id === id)!;
    assert.match(visualAt(epilogue, current.start).image, new RegExp(`${image}.webp$`));
    assert.ok(current.duration >= 1800);
    assert.equal(current.flash, undefined);
  }
  assert.ok(epilogue.cues.every(cue => !cue.fight && (!cue.text || cue.voice === 'boxer')));
  assert.ok(epilogue.cues.find(cue => cue.id === 'but')!.duration >= 1500);
});

test('aftermath and new-hero camera holds leave time to see the reveal; the single blank is discarded before exit', () => {
  const won = epilogue.cues[0];
  assert.ok(visualAt(epilogue, 400).camera.scale > visualAt(epilogue, 1500).camera.scale);
  assert.equal(visualAt(epilogue, 2800).camera.scale, 1);
  assert.ok(won.duration - Math.max(2800, won.speech.duration) >= 1000);
  assert.deepEqual(visualAt(epilogue, 1500, true), visualAt(epilogue, 400));
  for (const [at, image] of [[27400, 'crumple-v1'], [32699, 'crumple-v1'],
    [32700, 'discard-v1'], [33499, 'discard-v1'], [33500, 'exit-v1'], [39000, 'exit-v1']] as const) {
    assert.match(visualAt(epilogue, at).image, new RegExp(`epilogue-${image}.webp$`));
  }
  assert.deepEqual(epilogue.events, [{ time: 32700, sound: 'paper' }]);
  assert.equal(cueAt(epilogue, 32700).text, '');
  assert.equal(cueAt(epilogue, 36800).titleCard?.title, 'КОНЕЦ');
});
