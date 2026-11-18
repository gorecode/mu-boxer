import { planSpeech, type SpeechPlan, type Voice } from './speech.ts';

export type Sound = 'ring' | 'receiver' | 'paper' | 'chair' | 'impact' | 'queue-chime';
export interface Cue {
  id: string;
  label: string;
  duration: number;
  speaker: string;
  text: string;
  voice?: Voice;
  image?: string;
  imageAlt?: string;
  camera: { scale: number; x: number; y: number };
  sounds?: { at: number; sound: Sound }[];
  fight?: boolean;
  titleCard?: { eyebrow: string; title: string };
  setting?: string;
}
export interface Scene {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  imageAlt: string;
  opponent: string;
  intro?: { location: string; title: string };
  hardCuts?: boolean;
  cues: Cue[];
}
export interface TimedCue extends Cue { start: number; end: number; speech: SpeechPlan }
export interface CompiledScene extends Omit<Scene, 'cues'> {
  cues: TimedCue[];
  duration: number;
  events: { time: number; sound: Sound }[];
}

export function compileScene(scene: Scene): CompiledScene {
  if (!scene.id || scene.cues.length === 0) throw new Error('Сцена должна содержать кадры');
  let time = 0;
  const ids = new Set<string>();
  const cues = scene.cues.map((cue) => {
    if (!cue.id || ids.has(cue.id)) throw new Error('Повторяющийся или пустой ID кадра');
    ids.add(cue.id);
    if (cue.titleCard && (!cue.titleCard.title.trim() || cue.fight)) throw new Error('Неверный титр');
    if (!Number.isFinite(cue.duration) || cue.duration <= 0) throw new Error('Неверная длительность кадра');
    const { scale, x, y } = cue.camera;
    if (![scale, x, y].every(Number.isFinite) || scale < 1 || scale > 5 || x < 0 || x > 100 || y < 0 || y > 100) {
      throw new Error('Неверное кадрирование');
    }
    for (const event of cue.sounds ?? []) {
      if (!Number.isFinite(event.at) || event.at < 0 || event.at >= cue.duration) throw new Error('Звук вне кадра');
    }
    const speech = planSpeech(cue.text, cue.voice);
    if (speech.duration > cue.duration) throw new Error(`Реплика не помещается в кадр: ${cue.id}`);
    const result = { ...cue, start: time, end: time + cue.duration, speech };
    time = result.end;
    return result;
  });
  return { ...scene, cues, duration: time, events: cues.flatMap((cue) =>
    (cue.sounds ?? []).map((event) => ({ time: cue.start + event.at, sound: event.sound })),
  ).sort((a, b) => a.time - b.time) };
}

export function cueAt(scene: CompiledScene, time: number): TimedCue {
  return scene.cues.find((cue) => time < cue.end) ?? scene.cues[scene.cues.length - 1];
}

export function sceneImages(scene: CompiledScene): string[] {
  return [...new Set([scene.image, ...scene.cues.map((cue) => cue.image ?? scene.image)])];
}

export function sceneLink(scene: CompiledScene, time: number): string {
  return `#scene=${encodeURIComponent(scene.id)}&t=${(Math.max(0, Math.min(scene.duration, time)) / 1000).toFixed(1)}`;
}

export function readSceneLink(hash: string, scenes: CompiledScene[]): { scene: CompiledScene; time: number } {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const matched = scenes.find((scene) => scene.id === params.get('scene'));
  const scene = matched ?? scenes[0];
  const seconds = Number(params.get('t') ?? 0);
  return { scene, time: matched && Number.isFinite(seconds) ? Math.max(0, Math.min(scene.duration, Math.round(seconds * 1000))) : 0 };
}
