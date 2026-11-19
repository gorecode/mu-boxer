import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenes } from '../src/scenes.ts';
import { cueAt, readSceneLink, sceneImages, sceneLink, visualAt } from '../src/scene.ts';
import { subtitleAt } from '../src/speech.ts';
import { Timeline } from '../src/timeline.ts';

const scene = scenes.find((scene) => scene.id === 'worker')!;
const named = (id: string) => scene.cues.find((cue) => cue.id === id)!;

test('worker continues the certificate prologue and precedes the officer without replacing the recap', () => {
  assert.deepEqual(scenes.map((scene) => scene.id), ['intro', 'prologue', 'worker', 'precinct', 'queue']);
  assert.equal(scene.duration, 23800);
  assert.equal(scene.opponent, 'Рабочего');
  assert.deepEqual(readSceneLink(sceneLink(scene, 18900), scenes), { scene, time: 18900 });
  assert.equal(readSceneLink('#scene=worker&t=-1', scenes).time, 0);
  assert.equal(readSceneLink('#scene=worker&t=bad', scenes).time, 0);
  assert.equal(readSceneLink('#scene=worker&t=999', scenes).time, 23800);
  assert.equal(readSceneLink('', scenes).scene.id, 'intro');
  assert.equal(scenes.find((scene) => scene.id === 'prologue')!.duration, 27300);
  assert.equal(scenes.find((scene) => scene.id === 'precinct')!.duration, 30000);
});

test('approved dialogue leads into one serious self-justification with room to read each line', () => {
  assert.deepEqual(scene.cues.filter((cue) => cue.text).map((cue) => [cue.speaker, cue.text]), [
    ['Боксёр · рассказ', 'Но путь мне перегородил рабочий.'],
    ['Боксёр', 'Мне к участковому.'], ['Рабочий', 'Обходи.'],
    ['Боксёр', 'Так вот же дверь.'], ['Рабочий', 'А вот же лента.'],
    ['Боксёр · про себя', 'У меня не было времени обходить весь район. Поэтому…'],
    ['Боксёр · про себя', 'Я БЫЛ ВЫНУЖДЕН… начать драку.'],
  ]);
  for (const cue of scene.cues.filter((cue) => cue.text)) {
    assert.ok(cue.speech.duration < cue.duration, cue.id);
    assert.equal(subtitleAt(cue.speech, cue.speechDelay! - 1), '');
    assert.equal(subtitleAt(cue.speech, cue.duration - 1), cue.text);
    assert.equal(cue.voice, cue.speaker === 'Рабочий' ? 'officer' : 'boxer');
  }
  assert.ok(named('obstacle').duration - named('obstacle').speech.duration >= 600);
  assert.ok(named('tape').duration - named('tape').speech.duration >= 500);
  assert.deepEqual(scene.events, []);
});

test('all gesture panels preload and the original angry portrait bridges the thought boundary', () => {
  assert.deepEqual(sceneImages(scene).map((src) => src.split('/').at(-1)), [
    'worker-wide-v2.webp', 'worker-boxer-point-v2.webp', 'worker-tape-v2.webp', 'boxer-angry.webp', 'worker-ready-v2.webp',
  ]);
  const reason = named('reason'), forced = named('forced');
  assert.match(visualAt(scene, reason.start).image, /worker-wide-v2.webp$/);
  assert.notDeepEqual(visualAt(scene, reason.start + 1500).camera, visualAt(scene, reason.start).camera);
  assert.deepEqual(visualAt(scene, reason.start + 1500, true).camera, reason.shots![1].camera);
  assert.match(visualAt(scene, reason.start + 3800).image, /boxer-angry.webp$/);
  assert.deepEqual(visualAt(scene, forced.start).camera, visualAt(scene, reason.end - 1).camera);
  assert.equal(visualAt(scene, forced.start).image, visualAt(scene, reason.end - 1).image);
  assert.equal(cueAt(scene, reason.end).id, 'forced');
  assert.ok(reason.duration - reason.speech.duration >= 600);
});

test('the pose cut stays inside a single growing caption and holds before the fight title', () => {
  const forced = named('forced'), fight = named('fight');
  const cut = forced.start + 1600;
  assert.match(visualAt(scene, cut - 1).image, /boxer-angry.webp$/);
  assert.match(visualAt(scene, cut).image, /worker-ready-v2.webp$/);
  assert.equal(subtitleAt(forced.speech, 1599).trimEnd(), 'Я БЫЛ ВЫНУЖДЕН…');
  assert.equal(subtitleAt(forced.speech, 1600).trimEnd(), 'Я БЫЛ ВЫНУЖДЕН…');
  assert.match(subtitleAt(forced.speech, 2000), /^Я БЫЛ ВЫНУЖДЕН… начать/);
  assert.match(visualAt(scene, cut, true).image, /worker-ready-v2.webp$/);
  assert.ok(forced.duration - forced.speech.duration >= 1000);
  assert.equal(forced.end, fight.start);
  assert.deepEqual(visualAt(scene, forced.end - 1).camera, visualAt(scene, fight.start).camera);
  assert.equal(scene.cues.filter((cue) => cue.fight).length, 1);
  assert.equal(scene.cues.at(-1), fight);
  assert.equal(fight.text, '');
  assert.equal(fight.fight, true);
  assert.equal(fight.duration, 2500);
});

test('pause, seek, completion and replay preserve the worker scene and its final pose', () => {
  const player = new Timeline(scene);
  assert.equal(player.playing, false);
  player.seek(named('forced').start + 1700); player.play(); player.pause();
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
