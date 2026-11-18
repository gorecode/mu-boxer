import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenes } from '../src/scenes.ts';
import { compileScene, cueAt, readSceneLink, sceneImages, sceneLink } from '../src/scene.ts';
import { Timeline } from '../src/timeline.ts';

const intro = scenes.find((scene) => scene.id === 'intro')!;

test('the serial recap opens by default and preserves all scene links', () => {
  assert.equal(scenes.length, 3);
  assert.equal(scenes[0], intro);
  assert.equal(intro.duration, 41100);
  assert.equal(intro.cues.length, 19);
  assert.equal(sceneImages(intro).length, 10);
  assert.deepEqual(readSceneLink('', scenes), { scene: intro, time: 0 });
  assert.deepEqual(readSceneLink('#scene=unknown&t=30', scenes), { scene: intro, time: 0 });
  assert.deepEqual(readSceneLink('#scene=intro&t=NaN', scenes), { scene: intro, time: 0 });
  assert.deepEqual(readSceneLink(sceneLink(intro, 29000), scenes), { scene: intro, time: 29000 });
  assert.equal(readSceneLink('#scene=intro&t=999', scenes).time, 41100);
  for (const [id, duration] of [['precinct', 24000], ['queue', 27000]] as const) {
    const linked = readSceneLink(`#scene=${id}&t=2`, scenes);
    assert.equal(linked.scene.id, id);
    assert.equal(linked.scene.duration, duration);
    assert.equal(linked.time, 2000);
  }
});

test('dialogue establishes the accusation and goal, then shows escape, culprit and acquittal in order', () => {
  assert.deepEqual(intro.cues.map((cue) => cue.id), [
    'previously', 'murder', 'denial', 'accusation', 'prison', 'escape',
    'ticket', 'forced', 'controller-after', 'murderer', 'murderer-after', 'acquittal',
    'now', 'certificate', 'protest', 'procedure', 'reaction', 'tomorrow', 'title',
  ]);
  assert.deepEqual(intro.cues.slice(1, 5).map((cue) => [cue.speaker, cue.text]), [
    ['Милиционер', 'Твоего друга убили из этого пистолета.'],
    ['Боксёр', 'Я его раньше не видел.'],
    ['Милиционер', 'А нашли в твоём кармане.'],
    ['Боксёр', 'Я найду настоящего убийцу.'],
  ]);
  assert.match(cueAt(intro, 11600).image!, /intro-cell-v2.webp$/);
  assert.match(cueAt(intro, 14800).image!, /intro-escape-v2.webp$/);
  const verdict = cueAt(intro, 24900);
  assert.equal(verdict.speaker, 'Судья');
  assert.equal(verdict.text, 'Вы признаны невиновным.');
  assert.match(verdict.image!, /intro-court-v2.webp$/);
  assert.notEqual(verdict.image, cueAt(intro, 29000).image);
  const spoken = intro.cues.filter((cue) => cue.text);
  assert.equal(spoken.length, 12);
  assert.ok(spoken.every((cue) => !cue.speaker.includes('рассказ')));
  for (const cue of spoken) {
    assert.equal(cue.voice, cue.speaker.startsWith('Боксёр') ? 'boxer' : 'officer');
    assert.ok(cue.speech.duration > 0 && cue.speech.duration <= cue.duration);
  }
});

test('mundane ticket demand cuts to the forced excuse and a separate silent aftermath', () => {
  const ticket = cueAt(intro, 15900);
  const forced = cueAt(intro, 17500);
  const aftermath = cueAt(intro, 20500);
  assert.equal(ticket.text, 'Ваш билет.');
  assert.equal(ticket.speaker, 'Контролёр');
  assert.equal(forced.text, 'Я был вынужден разобраться.');
  assert.equal(forced.image, ticket.image);
  assert.ok(forced.camera.x < ticket.camera.x);
  assert.match(aftermath.image!, /intro-controller-after-v2.webp$/);
  assert.equal(aftermath.text, '');
  assert.equal(aftermath.speech.duration, 0);
  assert.deepEqual(aftermath.sounds, [{ at: 0, sound: 'impact' }]);
  assert.ok(aftermath.duration <= 1100);
});

test('time and place separate past events from the present-day certificate dialogue', () => {
  const divider = cueAt(intro, 27900);
  assert.equal(intro.cues[0].titleCard?.title, 'РАНЕЕ В «МЕСТИ БОКСЁРА»');
  assert.deepEqual(divider.titleCard, { eyebrow: 'После оправдания', title: 'СЕЙЧАС' });
  for (const cue of intro.cues.filter((cue) => !cue.titleCard)) {
    assert.ok(cue.setting?.startsWith(cue.start < divider.start ? 'РАНЕЕ · ' : 'СЕЙЧАС · '));
  }
  assert.deepEqual(intro.cues.filter((cue) => cue.start >= divider.end && cue.text).map((cue) => [cue.speaker, cue.text]), [
    ['Тренер', 'Справка об отсутствии судимости.'],
    ['Боксёр', 'Меня же оправдали.'],
    ['Тренер', 'А справка есть?'],
    ['Тренер', 'Турнир завтра.'],
  ]);
  const reaction = cueAt(intro, 36300);
  assert.equal(reaction.id, 'reaction');
  assert.equal(reaction.duration, 700);
  assert.equal(reaction.text, '');
  assert.deepEqual(reaction.sounds ?? [], []);
  assert.equal(cueAt(intro, 36299).id, 'procedure');
  assert.equal(cueAt(intro, 37000).id, 'tomorrow');
  assert.equal(cueAt(intro, 38899).id, 'tomorrow');
  assert.equal(cueAt(intro, 38900).titleCard?.title, 'МЕСТЬ БОКСЁРА II');
  assert.ok(intro.cues.every((cue) => !cue.fight));
  const player = new Timeline(intro);
  player.seek(38900); player.play(); player.advance(2201);
  assert.equal(player.time, 41100);
  assert.equal(player.playing, false);
  player.play();
  assert.equal(player.time, 0);
});

test('title cards accept plain text and reject empty headings or overlapping fight screens', () => {
  const card = intro.cues.at(-1)!;
  assert.doesNotThrow(() => compileScene({ ...intro, cues: [card] }));
  for (const title of ['', '  ']) {
    assert.throws(() => compileScene({ ...intro, cues: [{ ...card, titleCard: { eyebrow: '', title } }] }), /Неверный титр/);
  }
  assert.throws(() => compileScene({ ...intro, cues: [{ ...card, fight: true }] }), /Неверный титр/);
});
