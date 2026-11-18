import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenes } from '../src/scenes.ts';
import { compileScene, cueAt, readSceneLink, sceneImages, sceneLink } from '../src/scene.ts';
import { Timeline } from '../src/timeline.ts';

const intro = scenes.find((scene) => scene.id === 'intro')!;

test('the default introduction recaps the original and preserves existing scene links', () => {
  assert.equal(scenes.length, 3);
  assert.equal(scenes[0], intro);
  assert.equal(intro.duration, 42600);
  assert.equal(intro.cues.length, 15);
  assert.equal(sceneImages(intro).length, 7);
  assert.deepEqual(readSceneLink('', scenes), { scene: intro, time: 0 });
  assert.deepEqual(readSceneLink('#scene=unknown&t=30', scenes), { scene: intro, time: 0 });
  assert.deepEqual(readSceneLink('#scene=intro&t=NaN', scenes), { scene: intro, time: 0 });
  assert.deepEqual(readSceneLink(sceneLink(intro, 37800), scenes), { scene: intro, time: 37800 });
  assert.equal(readSceneLink('#scene=intro&t=999', scenes).time, 42600);
  for (const [id, duration] of [['precinct', 24000], ['queue', 27000]] as const) {
    const linked = readSceneLink(`#scene=${id}&t=2`, scenes);
    assert.equal(linked.scene.id, id);
    assert.equal(linked.scene.duration, duration);
    assert.equal(linked.time, 2000);
  }
});

test('canonical events lead from murder to acquittal, then the certificate contradiction', () => {
  const spoken = intro.cues.filter((cue) => cue.text);
  assert.deepEqual(spoken.map((cue) => cue.text), [
    'У меня убили лучшего друга.',
    'Пистолет нашли у меня в кармане.',
    'Как он туда попал, я не знал.',
    'Меня посадили.',
    'Пришлось выбираться самому.',
    'По дороге один тип потребовал билет.',
    'Я был вынужден разобраться.',
    'Убийцу я нашёл в бильярдной.',
    'После этого суд признал меня невиновным.',
    'Я снова занялся боксом.',
    'Для турнира потребовали справку.',
    'Об отсутствии судимости.',
    'Турнир был завтра.',
  ]);
  for (const cue of spoken) {
    assert.equal(cue.voice, 'boxer');
    assert.ok(cue.speech.duration > 0 && cue.speech.duration <= cue.duration);
  }
  const imageAt = (time: number): string => cueAt(intro, time).image ?? intro.image;
  assert.match(imageAt(0), /intro-arrest.webp$/);
  assert.match(imageAt(11800), /intro-prison.webp$/);
  assert.match(imageAt(18500), /intro-controller.webp$/);
  assert.match(imageAt(21500), /intro-billiards.webp$/);
  assert.match(imageAt(29200), /intro-gym.webp$/);
  assert.match(imageAt(35000), /intro-registration.webp$/);
});

test('a silent reaction separates the certificate from urgency; title ends without combat', () => {
  const reaction = cueAt(intro, 37800);
  assert.equal(cueAt(intro, 37799).id, 'record');
  assert.equal(reaction.id, 'reaction');
  assert.equal(reaction.duration, 800);
  assert.equal(reaction.text, '');
  assert.equal(reaction.speech.syllables.length, 0);
  assert.deepEqual(reaction.sounds ?? [], []);
  assert.match(reaction.image!, /boxer-thinking.webp$/);
  assert.equal(cueAt(intro, 38600).id, 'tomorrow');
  assert.equal(cueAt(intro, 40599).id, 'tomorrow');
  assert.deepEqual(cueAt(intro, 40600).titleCard, { eyebrow: 'Турнир завтра.', title: 'МЕСТЬ БОКСЁРА II' });
  assert.ok(intro.cues.every((cue) => !cue.fight));
  const player = new Timeline(intro);
  player.seek(40600);
  assert.equal(player.playing, false);
  player.play(); player.advance(2001);
  assert.equal(player.time, 42600);
  assert.equal(player.playing, false);
  assert.equal(cueAt(intro, player.time).id, 'title');
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
