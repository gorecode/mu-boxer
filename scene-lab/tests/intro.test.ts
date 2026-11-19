import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenes } from '../src/scenes.ts';
import { compileScene, cueAt, readSceneLink, sceneImages, sceneLink, visualAt } from '../src/scene.ts';
import { Timeline } from '../src/timeline.ts';

const intro = scenes[0];

test('the narrated intro opens by default and retains links to the other scenes', () => {
  assert.equal(intro.id, 'intro');
  assert.equal(scenes.length, 3);
  assert.deepEqual(readSceneLink('', scenes), { scene: intro, time: 0 });
  assert.deepEqual(readSceneLink('#scene=unknown&t=30', scenes), { scene: intro, time: 0 });
  assert.equal(readSceneLink('#scene=intro&t=NaN', scenes).time, 0);
  assert.equal(readSceneLink('#scene=intro&t=999', scenes).time, intro.duration);
  assert.equal(readSceneLink(sceneLink(intro, 29000), scenes).time, 29000);
  for (const [id, duration] of [['precinct', 24000], ['queue', 27000]] as const) {
    const linked = readSceneLink(`#scene=${id}&t=2`, scenes);
    assert.equal(linked.scene.id, id);
    assert.equal(linked.scene.duration, duration);
    assert.equal(linked.time, 2000);
  }
});

test('the approved first-person text is spoken only by the calm boxer and ends at the gym', () => {
  assert.equal(intro.cues.map((cue) => cue.text).join(' '),
    'Когда-то убили моего лучшего друга. А пистолет нашли у меня в кармане. Как он туда попал, я не знал. ' +
    'Суд не стал слушать. И меня посадили в тюрьму. Но я сбежал. И вернулся в Москву, чтобы найти убийцу. ' +
    'Но весь мир был против меня. Каждый встречный пытался мне помешать. ' +
    'Я никому не хотел причинять зла. Но был вынужден. ' +
    'Преодолев все трудности, я добрался до мерзавца, который меня подставил. ' +
    'Меня оправдали. Я снова стал заниматься боксом.');
  assert.ok(intro.cues.length > 0);
  for (const cue of intro.cues) {
    assert.equal(cue.speaker, 'Боксёр · рассказ');
    assert.equal(cue.voice, 'boxer');
    assert.ok(cue.speech.duration > 0 && cue.speech.duration < cue.duration);
    assert.ok(!cue.fight && !cue.titleCard);
  }
  assert.match(visualAt(intro, intro.duration).image, /intro-gym-v3.webp$/);
  const noHarm = intro.cues.find((cue) => cue.id === 'no-harm')!;
  assert.ok(noHarm.duration - noHarm.speech.duration >= 650);
  assert.match(visualAt(intro, noHarm.end - 1).image, /boxer-angry.webp$/);
  assert.match(visualAt(intro, noHarm.end).image, /intro-woman-after-v3.webp$/);
});

test('all fifteen illustrations preload, including later plans inside a single spoken cue', () => {
  assert.equal(sceneImages(intro).length, 14);
  const actual = intro.cues.flatMap((cue) => cue.shots ?? []).map((shot) => shot.image.split('/').at(-1));
  assert.deepEqual(actual, [
    'intro-gym-v3.webp', 'intro-arrest.webp', 'intro-arrest.webp', 'intro-arrest.webp',
    'intro-court-v2.webp', 'intro-cell-v3.webp', 'intro-escape-v3.webp', 'intro-road-v3.webp',
    'intro-driver-v3.webp', 'intro-biker-v3.webp', 'intro-woman-v3.webp', 'boxer-angry.webp',
    'intro-woman-after-v3.webp', 'intro-controller-v3.webp', 'intro-billiards-v3.webp',
    'intro-acquittal-v3.webp', 'intro-gym-v3.webp',
  ]);
  for (const cue of intro.cues) {
    for (const [index, shot] of (cue.shots ?? []).entries()) {
      assert.equal(visualAt(intro, cue.start + shot.at).image, shot.image);
      if (index) assert.equal(visualAt(intro, cue.start + shot.at - 1).image, cue.shots![index - 1].image);
    }
  }
});

test('gun and face framing follow the spoken words without restarting the narration', () => {
  const pistol = intro.cues.find((cue) => cue.id === 'pistol')!;
  const [, gun, face] = pistol.shots!;
  for (const [shot, word] of [[gun, 'пистолет'], [face, 'Как']] as const) {
    const offset = pistol.text.indexOf(word);
    assert.equal(shot.at, pistol.speech.letters.find((letter) => letter.end > offset)!.at);
    assert.equal(cueAt(intro, pistol.start + shot.at), pistol);
  }
  assert.ok(gun.camera.x > face.camera.x);
  assert.ok(gun.camera.scale > 2);
});

test('camera movement is deterministic at seek, pause, reduced motion and the final boundary', () => {
  const first = intro.cues[0];
  const from = first.shots![0].camera;
  const to = first.shots![0].cameraEnd!;
  const middle = visualAt(intro, first.duration / 2);
  assert.equal(middle.camera.scale, (from.scale + to.scale) / 2);
  assert.deepEqual(visualAt(intro, first.duration / 2, true).camera, from);
  const player = new Timeline(intro);
  player.play(); player.advance(first.duration / 2); player.pause(); player.advance(1000);
  assert.deepEqual(visualAt(intro, player.time), middle);
  player.seek(intro.duration); player.play();
  assert.equal(player.time, 0);
  player.advance(intro.duration + 1);
  assert.equal(player.playing, false);
  assert.deepEqual(visualAt(intro, intro.duration).camera, { scale: 1, x: 50, y: 50 });
  const precinct = scenes[1];
  assert.deepEqual(visualAt(precinct, 0).camera, precinct.cues[0].camera);
});

test('invalid plan ordering, timing, assets and camera endpoints fail before playback', () => {
  const cue = intro.cues[0];
  const shot = cue.shots![0];
  const invalid = [
    [], [{ ...shot, at: 1 }], [shot, { ...shot, at: 0 }],
    [shot, { ...shot, at: cue.duration }], [shot, { ...shot, at: NaN }],
    [{ ...shot, image: '' }], [{ ...shot, imageAlt: ' ' }],
    [{ ...shot, cameraEnd: { scale: 6, x: 50, y: 50 } }],
    [{ ...shot, camera: { scale: 1, x: -1, y: 50 } }],
  ];
  for (const shots of invalid) assert.throws(() => compileScene({ ...intro, cues: [{ ...cue, shots }] }));
  const titleCard = { eyebrow: '', title: 'Титр' };
  assert.doesNotThrow(() => compileScene({ ...intro, cues: [{ ...cue, titleCard }] }));
  for (const title of ['', '  ']) {
    assert.throws(() => compileScene({ ...intro, cues: [{ ...cue, titleCard: { eyebrow: '', title } }] }), /Неверный титр/);
  }
  assert.throws(() => compileScene({ ...intro, cues: [{ ...cue, titleCard, fight: true }] }), /Неверный титр/);
});
