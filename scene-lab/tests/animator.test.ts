import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenes } from '../src/scenes.ts';
import { cueAt, readSceneLink, sceneImages, sceneLink, visualAt } from '../src/scene.ts';
import { subtitleAt } from '../src/speech.ts';

const scene = scenes.find((scene) => scene.id === 'animator')!;
const cue = (id: string) => scene.cues.find((cue) => cue.id === id)!;

test('MFC clue, destroyed office exit and Boxer-only introduction precede the leaflet offer', () => {
  assert.ok(scene);
  assert.equal(scenes[scenes.indexOf(scene) - 1].id, 'precinct');
  assert.equal(scene.duration, 38400);
  assert.equal(scene.opponent, 'Аниматора');
  assert.match(visualAt(scene, 0).image, /animator-memo-v2.webp$/);
  assert.equal(cueAt(scene, 3599).id, 'memo');
  assert.match(visualAt(scene, 3600).image, /animator-exit-v2.webp$/);
  assert.match(visualAt(scene, 6600).image, /animator-solo-v1.webp$/);
  assert.match(visualAt(scene, 8599).image, /animator-solo-v1.webp$/);
  assert.match(visualAt(scene, 8600).image, /animator-wide-v2.webp$/);
  assert.equal(cueAt(scene, 8600).id, 'interruption');
  assert.ok(subtitleAt(cue('interruption').speech, 2000).length > 0);
  assert.deepEqual(readSceneLink(sceneLink(scene, 24000), scenes), { scene, time: 24000 });
  for (const [seconds, expected] of [['-1', 0], ['NaN', 0], ['999', scene.duration]] as const) {
    assert.equal(readSceneLink(`#scene=animator&t=${seconds}`, scenes).time, expected);
  }
  assert.equal(readSceneLink('', scenes).scene.id, 'intro');
});

test('shorter approved words stay calm; the leaflet reading starts after a silent pause', () => {
  assert.deepEqual(scene.cues.filter((cue) => cue.text).map((cue) => cue.text), [
    'Я узнал, куда мне нужно.', 'Я направился в МФЦ.', 'Но меня остановил ушастый зазывала.',
    'Где здесь МФЦ?', 'Приведи друга — получи подарок.', 'Моего друга убили.', 'Тебе смешно?',
    'Я ничего плохого ему не сказал.', 'А он уже поднял на меня руку.',
    'Он вынудил меня защищаться.',
  ]);
  for (const spoken of scene.cues.filter((cue) => cue.text)) {
    assert.equal(spoken.voice, 'boxer');
    assert.equal(subtitleAt(spoken.speech, spoken.speechDelay! - 1), '');
    assert.equal(subtitleAt(spoken.speech, spoken.duration - 1), spoken.text);
    assert.ok(spoken.duration - spoken.speech.duration >= 300);
  }
  assert.equal(cue('leaflet').speechDelay, 800);
  assert.equal(subtitleAt(cue('leaflet').speech, 799), '');
  assert.equal(subtitleAt(cue('leaflet').speech, 899), '');
  assert.ok(subtitleAt(cue('leaflet').speech, 1100).length > 0);
});

test('unchanged offered leaflet and smile hold after the death line before the question', () => {
  const friend = cue('friend'), smile = cue('smile'), question = cue('command');
  assert.equal(friend.end, smile.start);
  assert.equal(smile.speech.duration, 0);
  assert.ok(smile.duration >= 1700);
  assert.match(visualAt(scene, smile.start).image, /animator-wide-v2.webp$/);
  assert.equal(visualAt(scene, smile.start).image, visualAt(scene, friend.start).image);
  assert.deepEqual(visualAt(scene, smile.start), visualAt(scene, smile.end - 1));
  assert.equal(subtitleAt(smile.speech, 1000), '');
  assert.equal(cueAt(scene, smile.end - 1).id, 'smile');
  assert.equal(cueAt(scene, smile.end).id, 'command');
  assert.equal(question.text, 'Тебе смешно?');
});

test('thought and anger hold until final art, fight title and brief flash start together', () => {
  const thought = cue('raised-hand'), reaction = cue('reaction'), forced = cue('forced');
  const normal = visualAt(scene, cue('gesture').start);
  assert.equal(normal.camera.scale, 1);
  assert.match(normal.image, /animator-gesture-v2.webp$/);
  for (const id of ['innocent', 'raised-hand']) {
    const current = cue(id);
    assert.equal(visualAt(scene, current.start).image, normal.image);
    assert.deepEqual(visualAt(scene, current.start).camera, normal.camera);
    assert.deepEqual(visualAt(scene, current.end - 1).camera, normal.camera);
  }
  assert.equal(thought.end, reaction.start);
  assert.equal(reaction.speech.duration, 0);
  assert.ok(reaction.duration >= 400);
  assert.match(visualAt(scene, reaction.start).image, /animator-ready-v2.webp$/);
  for (const at of [reaction.start, forced.start, forced.start + 1500, forced.end - 1]) {
    assert.deepEqual(visualAt(scene, at).camera, normal.camera);
    assert.deepEqual(visualAt(scene, at, true).camera, normal.camera);
  }
  assert.ok(forced.duration - forced.speech.duration >= 600);
  assert.equal(cueAt(scene, forced.end).id, 'settle');
  assert.match(visualAt(scene, forced.end).image, /animator-ready-v2.webp$/);
  const flash = cue('fight-flash'), fight = cue('fight');
  assert.equal(flash.start, 35900);
  assert.match(visualAt(scene, flash.start - 1).image, /animator-ready-v2.webp$/);
  assert.match(visualAt(scene, flash.start).image, /animator-final-v2.webp$/);
  assert.equal(cueAt(scene, flash.start - 1).fight, undefined);
  assert.equal(flash.fight, true);
  assert.equal(flash.flash, true);
  assert.equal(flash.duration, 120);
  assert.equal(flash.end, fight.start);
  assert.equal(cueAt(scene, flash.end - 1).flash, true);
  assert.equal(fight.flash, undefined);
  assert.equal(fight.fight, true);
  assert.deepEqual(scene.events, [{ time: 100, sound: 'paper' }, { time: 12500, sound: 'paper' }, { time: 35900, sound: 'impact' }]);
  assert.equal(scene.cues.some((cue) => cue.id === 'brick'), false);
  assert.equal(scene.cues.at(-1)!.fight, true);
  assert.equal(scene.cues.filter((cue) => cue.fight).length, 2);
  assert.deepEqual(visualAt(scene, cue('settle').start).camera, visualAt(scene, scene.duration).camera);
  assert.equal(sceneImages(scene).length, 8);
  assert.equal(sceneImages(scene).some((src) => /animator-(brick|wide|gesture|ready|final)-v1/.test(src)), false);
});

test('the approved dialogue view keeps the Boxer head fully visible', () => {
  const head = { left: .20, right: .30, top: .05, bottom: .24 };
  for (const id of ['directions', 'friend', 'command']) {
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
