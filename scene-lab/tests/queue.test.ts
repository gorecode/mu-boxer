import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenes } from '../src/scenes.ts';
import { cueAt, readSceneLink, sceneImages, sceneLink } from '../src/scene.ts';

const queue = scenes.find((scene) => scene.id === 'queue')!;

test('queue is a separate reviewable scene with its own introduction and inflected opponent', () => {
  assert.ok(queue);
  assert.equal(queue.title, 'Только через мой труп');
  assert.equal(queue.opponent, 'Бабки');
  assert.equal(queue.intro?.title, 'Меня вызвали.');
  assert.equal(queue.duration, 27000);
  assert.equal(queue.cues.length, 10);
  assert.equal(sceneImages(queue).length, 5);
  assert.equal(scenes[0].id, 'precinct');
  assert.equal(scenes[0].duration, 24000);
});

test('approved dialogue progresses from an ordinary queue dispute to humane self-exoneration', () => {
  assert.deepEqual(queue.cues.filter((cue) => cue.text).map((cue) => [cue.speaker, cue.text]), [
    ['Бабка', 'Я занимала.'],
    ['Боксёр', 'Меня вызвали.'],
    ['Бабка', 'Я ещё до тебя занимала.'],
    ['Бабка', 'Мужчина. Только через мой труп.'],
    ['Боксёр · про себя', 'Убивать эту женщину я не собирался.'],
    ['Боксёр · про себя', 'Поэтому я был вынужден начать драку.'],
  ]);
  for (const cue of queue.cues) assert.ok(cue.speech.duration <= cue.duration, cue.id);
  for (const cue of queue.cues.filter((cue) => cue.speaker === 'Бабка')) assert.equal(cue.voice, 'grandma');
});

test('ticket and called number precede the bag blockade; only the boxer initiates fighting', () => {
  assert.equal(queue.cues[0].label, 'Талон № 111');
  assert.equal(queue.cues[1].label, 'Вызван № 111');
  assert.ok(queue.cues[0].image?.endsWith('queue-ticket.webp'));
  assert.ok(queue.events.some((event) => event.time === 1500 && event.sound === 'queue-chime'));
  const block = queue.cues.find((cue) => cue.id === 'block')!;
  const ultimatum = queue.cues.find((cue) => cue.id === 'ultimatum')!;
  const thinking = queue.cues.find((cue) => cue.id === 'thinking')!;
  const forced = queue.cues.find((cue) => cue.id === 'forced')!;
  assert.equal(block.text, '');
  assert.equal(block.speech.duration, 0);
  assert.equal(block.end, ultimatum.start);
  assert.equal(ultimatum.end, thinking.start);
  assert.ok(thinking.image?.endsWith('boxer-thinking.webp'));
  assert.ok(thinking.duration - thinking.speech.duration >= 1000);
  assert.equal(thinking.end, forced.start);
  assert.equal(cueAt(queue, forced.start - 1).id, 'thinking');
  assert.equal(cueAt(queue, forced.start).id, 'forced');
  assert.ok(forced.image?.endsWith('queue-boxer-ready.webp'));
  assert.equal(forced.voice, 'boxer');
  assert.equal(queue.cues.at(-1)?.fight, true);
  assert.deepEqual(queue.events.filter((event) => event.sound === 'impact'), [{ time: forced.start, sound: 'impact' }]);
});

test('queue links round-trip and stay separate from precinct with identical cue ids', () => {
  const moment = queue.cues.find((cue) => cue.id === 'thinking')!.start;
  assert.deepEqual(readSceneLink(sceneLink(queue, moment), scenes), { scene: queue, time: moment });
  assert.equal(readSceneLink('#scene=queue&t=999', scenes).time, 27000);
  assert.equal(readSceneLink('#scene=queue&t=-1', scenes).time, 0);
  assert.equal(readSceneLink('#scene=queue&t=bad', scenes).time, 0);
  assert.equal(readSceneLink('#scene=unknown&t=10', scenes).scene.id, 'precinct');
});
