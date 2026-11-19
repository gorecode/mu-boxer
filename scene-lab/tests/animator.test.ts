import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenes } from '../src/scenes.ts';
import { cueAt, readSceneLink, sceneImages, sceneLink, visualAt } from '../src/scene.ts';
import { subtitleAt } from '../src/speech.ts';

const scene = scenes.find((scene) => scene.id === 'animator')!;
const cue = (id: string) => scene.cues.find((cue) => cue.id === id)!;

test('animator follows the officer, opens with the MFC clue and keeps its own links', () => {
  assert.ok(scene);
  assert.equal(scenes[scenes.indexOf(scene) - 1].id, 'precinct');
  assert.equal(scene.duration, 34300);
  assert.equal(scene.opponent, 'Аниматора');
  assert.equal(cueAt(scene, 0).id, 'memo');
  assert.match(visualAt(scene, 0).image, /animator-memo-v2.webp$/);
  assert.deepEqual(readSceneLink(sceneLink(scene, 18000), scenes), { scene, time: 18000 });
  for (const [seconds, expected] of [['-1', 0], ['NaN', 0], ['999', scene.duration]] as const) {
    assert.equal(readSceneLink(`#scene=animator&t=${seconds}`, scenes).time, expected);
  }
  assert.equal(readSceneLink('', scenes).scene.id, 'intro');
});

test('approved dialogue stays calm; the leaflet and fixed smile are silent reading beats', () => {
  assert.deepEqual(scene.cues.filter((cue) => cue.text).map((cue) => cue.text), [
    'Как я и предполагал, участковый знал, куда мне нужно.',
    'Где здесь МФЦ?', 'Моего друга убили.', 'Тебе смешно? Улыбку убери.',
    'Я ничего плохого ему не сказал.', 'А он уже поднял на меня руку.',
    'Я был вынужден защищаться.',
  ]);
  for (const spoken of scene.cues.filter((cue) => cue.text)) {
    assert.equal(spoken.voice, 'boxer');
    assert.equal(subtitleAt(spoken.speech, spoken.speechDelay! - 1), '');
    assert.equal(subtitleAt(spoken.speech, spoken.duration - 1), spoken.text);
    assert.ok(spoken.duration - spoken.speech.duration >= 300);
  }
  assert.equal(cue('leaflet').speech.duration, 0);
  assert.ok(cue('leaflet').duration >= 2000);
  assert.equal(cue('smile').speech.duration, 0);
  assert.deepEqual(visualAt(scene, cue('smile').start).image, visualAt(scene, cue('friend').start).image);
  assert.ok(cue('smile').duration >= 700);
});

test('harmless gesture precedes the false accusation; anger starts only after the thought ends', () => {
  const gesture = cue('gesture'), thought = cue('raised-hand'), reaction = cue('reaction');
  assert.match(visualAt(scene, gesture.start).image, /animator-gesture-v1.webp$/);
  assert.equal(gesture.text, '');
  assert.ok(gesture.duration >= 800);
  assert.equal(cueAt(scene, thought.end - 1).id, 'raised-hand');
  assert.match(visualAt(scene, thought.end - 1).image, /animator-wide-v1.webp$/);
  assert.equal(thought.end, reaction.start);
  assert.match(visualAt(scene, reaction.start).image, /animator-ready-v1.webp$/);
  assert.equal(reaction.speech.duration, 0);
  assert.ok(reaction.duration >= 500);
});

test('dialogue and the angry pullback keep the Boxer head inside the frame', () => {
  const head = { left: .20, right: .30, top: .05, bottom: .24 };
  for (const id of ['directions', 'friend', 'command', 'raised-hand', 'reaction', 'forced']) {
    const current = cue(id);
    for (const elapsed of [0, current.duration / 2, current.duration - 1]) {
      const { scale, x, y } = visualAt(scene, current.start + elapsed).camera;
      assert.ok(head.left * scale - x / 100 * (scale - 1) >= .02, id);
      assert.ok(head.right * scale - x / 100 * (scale - 1) <= .98, id);
      assert.ok(head.top * scale - y / 100 * (scale - 1) >= .02, id);
      assert.ok(head.bottom * scale - y / 100 * (scale - 1) <= .98, id);
    }
  }
});

test('self-defence reveals the same angry face during speech, then holds before the brick ritual', () => {
  const forced = cue('forced');
  const close = visualAt(scene, forced.start), moving = visualAt(scene, forced.start + 1000);
  const settled = visualAt(scene, forced.start + 1800);
  assert.equal(close.image, visualAt(scene, cue('reaction').start).image);
  assert.equal(moving.image, close.image);
  assert.equal(settled.image, close.image);
  assert.ok(close.camera.scale > moving.camera.scale && moving.camera.scale > settled.camera.scale);
  assert.equal(settled.camera.scale, 1);
  assert.ok(subtitleAt(forced.speech, 1000).length > 0);
  assert.ok(forced.speech.duration > 1800);
  assert.ok(forced.duration - forced.speech.duration >= 700);
  assert.deepEqual(visualAt(scene, forced.end - 1), settled);
  assert.deepEqual(visualAt(scene, forced.start + 1000, true).camera, close.camera);
  assert.deepEqual(visualAt(scene, forced.start + 1800, true), settled);
  assert.equal(cueAt(scene, forced.end).id, 'brick');
  assert.equal(cue('brick').text, '');
  assert.match(visualAt(scene, forced.end).image, /animator-brick-v1.webp$/);
  assert.equal(cue('settle').end, cue('fight').start);
  assert.ok(cue('settle').duration >= 1200);
  assert.equal(scene.cues.at(-1)!.fight, true);
  assert.equal(scene.cues.filter((cue) => cue.fight).length, 1);
  assert.match(visualAt(scene, scene.duration).image, /animator-final-v1.webp$/);
  assert.equal(sceneImages(scene).length, 7);
});
