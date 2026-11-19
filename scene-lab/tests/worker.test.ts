import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenes } from '../src/scenes.ts';
import { cueAt, readSceneLink, sceneImages, sceneLink, visualAt } from '../src/scene.ts';
import { subtitleAt } from '../src/speech.ts';
import { Timeline } from '../src/timeline.ts';

const scene = scenes.find((scene) => scene.id === 'worker')!;
const named = (id: string) => scene.cues.find((cue) => cue.id === id)!;

test('worker continues the prologue with isolated links and leaves the officer arrival intact', () => {
  assert.deepEqual(scenes.map((scene) => scene.id), ['intro', 'prologue', 'worker', 'precinct', 'animator', 'queue']);
  assert.equal(scene.duration, 23120);
  assert.equal(scene.opponent, 'Рабочего');
  assert.deepEqual(readSceneLink(sceneLink(scene, 18900), scenes), { scene, time: 18900 });
  assert.equal(readSceneLink('#scene=worker&t=-1', scenes).time, 0);
  assert.equal(readSceneLink('#scene=worker&t=bad', scenes).time, 0);
  assert.equal(readSceneLink('#scene=worker&t=999', scenes).time, 23120);
  assert.equal(readSceneLink('', scenes).scene.id, 'intro');
  assert.equal(scenes.find((scene) => scene.id === 'prologue')!.duration, 27300);
  assert.equal(scenes.find((scene) => scene.id === 'precinct')!.duration, 30000);
});

test('the shorter thought and realization retain serious voices and readable holds', () => {
  assert.deepEqual(scene.cues.filter((cue) => cue.text).map((cue) => [cue.speaker, cue.text]), [
    ['Боксёр · рассказ', 'Но путь мне перегородил рабочий.'],
    ['Боксёр', 'Мне к участковому.'], ['Рабочий', 'Обходи.'],
    ['Боксёр', 'Так вот же дверь.'], ['Рабочий', 'А вот же лента.'],
    ['Боксёр · про себя', 'У меня не было времени обходить.'],
    ['Боксёр · про себя', 'И я понял…'],
    ['Боксёр · про себя', 'ДРАКА НЕИЗБЕЖНА!'],
  ]);
  for (const cue of scene.cues.filter((cue) => cue.text)) {
    assert.ok(cue.speech.duration < cue.duration, cue.id);
    assert.equal(subtitleAt(cue.speech, cue.speechDelay! - 1), '');
    assert.equal(subtitleAt(cue.speech, cue.duration - 1), cue.text);
    assert.equal(cue.voice, cue.speaker === 'Рабочий' ? 'officer' : 'boxer');
  }
  assert.ok(named('obstacle').duration - named('obstacle').speech.duration >= 600);
  assert.ok(named('tape').duration - named('tape').speech.duration >= 500);
  assert.ok(named('realization').duration - named('realization').speech.duration >= 400);
});

test('the angry closeup and pullback use the same courtyard drawing with no separate portrait', () => {
  assert.deepEqual(sceneImages(scene).map((src) => src.split('/').at(-1)), [
    'worker-wide-v2.webp', 'worker-boxer-point-v2.webp', 'worker-tape-v2.webp', 'worker-ready-v2.webp',
  ]);
  const flash = named('flash'), inevitable = named('inevitable');
  assert.match(visualAt(scene, flash.start).image, /worker-ready-v2.webp$/);
  for (const at of [inevitable.start, inevitable.start + 900, inevitable.end - 1]) {
    assert.equal(visualAt(scene, at).image, visualAt(scene, flash.start).image);
  }
  assert.deepEqual(visualAt(scene, flash.end - 1).camera, visualAt(scene, inevitable.start).camera);
});

test('dialogue and the angry pullback preserve the complete head with visible headroom', () => {
  for (const [id, bounds] of [
    ['request', { left: .19, right: .29, top: .04, bottom: .24 }],
    ['door', { left: .19, right: .29, top: .04, bottom: .24 }],
    ['inevitable', { left: .18, right: .30, top: .08, bottom: .27 }],
  ] as const) {
    const cue = named(id);
    for (const offset of [0, cue.duration / 2, cue.duration - 1]) {
      const { scale, x, y } = visualAt(scene, cue.start + offset).camera;
      const left = bounds.left * scale - x / 100 * (scale - 1);
      const right = bounds.right * scale - x / 100 * (scale - 1);
      const top = bounds.top * scale - y / 100 * (scale - 1);
      const bottom = bounds.bottom * scale - y / 100 * (scale - 1);
      assert.ok(left >= .02 && right <= .98 && top >= .02 && bottom <= .98, `${id}: full head inside frame`);
    }
  }
});

test('inevitable fight pulls back during speech and settles before the fight title', () => {
  const cue = named('inevitable'), fight = named('fight');
  const close = visualAt(scene, cue.start), middle = visualAt(scene, cue.start + 900);
  const full = visualAt(scene, cue.start + 1600);
  assert.ok(close.camera.scale > middle.camera.scale && middle.camera.scale > full.camera.scale);
  assert.equal(full.camera.scale, 1);
  assert.ok(subtitleAt(cue.speech, 900).length > 0);
  assert.ok(cue.speech.duration >= 1600);
  assert.deepEqual(visualAt(scene, cue.start + 900, true).camera, close.camera);
  assert.deepEqual(visualAt(scene, cue.start + 1600, true).camera, full.camera);
  assert.deepEqual(visualAt(scene, cue.end - 1).camera, full.camera);
  assert.ok(cue.duration - cue.speech.duration >= 1000);
  assert.equal(cue.end, fight.start);
  assert.deepEqual(visualAt(scene, cue.end - 1).camera, visualAt(scene, fight.start).camera);
  assert.equal(scene.cues.filter((cue) => cue.fight).length, 1);
  assert.equal(scene.cues.at(-1), fight);
  assert.equal(fight.text, '');
});

test('one brief silent flash separates realization from the pullback at exact boundaries', () => {
  const realization = named('realization'), flash = named('flash'), inevitable = named('inevitable');
  assert.equal(realization.end, flash.start);
  assert.equal(flash.duration, 120);
  assert.equal(flash.text, '');
  assert.equal(flash.speech.duration, 0);
  assert.equal(flash.flash, true);
  assert.equal(flash.end, inevitable.start);
  assert.equal(cueAt(scene, flash.start - 1).id, 'realization');
  assert.equal(cueAt(scene, flash.end - 1).id, 'flash');
  assert.equal(cueAt(scene, flash.end).id, 'inevitable');
  assert.deepEqual(scene.events, [{ time: flash.start, sound: 'impact' }]);
  assert.equal(scenes.flatMap((scene) => scene.cues).filter((cue) => cue.flash).length, 1);
});

test('pause during the pullback freezes framing; completion and replay preserve the final pose', () => {
  const player = new Timeline(scene);
  assert.equal(player.playing, false);
  player.seek(named('inevitable').start + 700); player.play(); player.pause();
  const pose = visualAt(scene, player.time);
  player.advance(500);
  assert.deepEqual(visualAt(scene, player.time), pose);
  player.play(); player.advance(scene.duration);
  assert.equal(player.time, scene.duration);
  assert.equal(player.playing, false);
  assert.match(visualAt(scene, player.time).image, /worker-ready-v2.webp$/);
  player.play();
  assert.equal(player.time, 0);
  assert.match(visualAt(scene, player.time).image, /worker-wide-v2.webp$/);
});

test('the officer scene opens after victory with concrete tracks, narration and a settled hold', () => {
  const precinct = scenes.find((scene) => scene.id === 'precinct')!;
  const arrival = precinct.cues[0], request = precinct.cues[1];
  assert.equal(arrival.id, 'arrival');
  assert.equal(arrival.text, 'Рабочий больше не возражал. Я прошёл к участковому.');
  assert.equal(arrival.voice, 'boxer');
  assert.equal(arrival.start, 0);
  assert.equal(arrival.end, 6000);
  assert.equal(request.id, 'request');
  assert.equal(request.start, arrival.end);
  assert.match(visualAt(precinct, 0).image, /worker-aftermath-v2.webp$/);
  assert.ok(sceneImages(precinct).some((image) => image.endsWith('worker-aftermath-v2.webp')));
  assert.equal(subtitleAt(arrival.speech, 149), '');
  assert.equal(subtitleAt(arrival.speech, 5999), arrival.text);
  assert.ok(arrival.duration - Math.max(arrival.speech.duration, arrival.shots!.at(-1)!.at) >= 1000);
  assert.deepEqual(visualAt(precinct, 5000), visualAt(precinct, 5999));
  assert.deepEqual(visualAt(precinct, 1500, true).camera, arrival.camera);
  assert.match(visualAt(precinct, 6000).image, /precinct-idle.webp$/);
  assert.equal(cueAt(precinct, 5999).id, 'arrival');
  assert.equal(cueAt(precinct, 6000).id, 'request');
});
