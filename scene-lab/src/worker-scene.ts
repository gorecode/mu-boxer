import type { Scene } from './scene.ts';

const art = (name: string): string => `${import.meta.env?.BASE_URL ?? './'}art/${name}.webp`;
const wide = { scale: 1, x: 50, y: 50 };
const boxer = { scale: 1.45, x: 0, y: 0 };
const worker = { scale: 1.45, x: 100, y: 25 };
const angry = { scale: 3.2, x: 12, y: 5 };
const courtyard = art('worker-wide-v2');
const ready = art('worker-ready-v2');

export const workerScene: Scene = {
  id: 'worker', title: 'А вот же лента', subtitle: 'Глава 01 · Рабочий',
  intro: { location: 'Двор. В двух шагах от участкового.', title: 'Но путь мне перегородили.' },
  image: courtyard,
  imageAlt: 'Боксёр слева перед лентой, Рабочий справа у свежей дорожки. Позади него дверь участкового; обувь Боксёра чистая.',
  opponent: 'Рабочего', hardCuts: true,
  cues: [
    { id: 'obstacle', label: 'Путь перегорожен', duration: 3600, speechDelay: 150,
      speaker: 'Боксёр · рассказ', voice: 'boxer', text: 'Но путь мне перегородил рабочий.', camera: wide },
    { id: 'request', label: 'Мне к участковому', duration: 2400, speechDelay: 100,
      speaker: 'Боксёр', voice: 'boxer', text: 'Мне к участковому.', camera: boxer },
    { id: 'detour', label: 'Обходи', duration: 1500, speechDelay: 100,
      speaker: 'Рабочий', voice: 'officer', text: 'Обходи.', camera: worker },
    { id: 'door', label: 'Так вот же дверь', duration: 1900, speechDelay: 100,
      speaker: 'Боксёр', voice: 'boxer', text: 'Так вот же дверь.', camera: wide,
      image: art('worker-boxer-point-v2'), imageAlt: 'Спокойный Боксёр указывает на близкую дверь участкового за Рабочим.' },
    { id: 'tape', label: 'А вот же лента', duration: 2300, speechDelay: 100,
      speaker: 'Рабочий', voice: 'officer', text: 'А вот же лента.', camera: wide,
      image: art('worker-tape-v2'), imageAlt: 'Рабочий деловито показывает на ленту перед Боксёром; никто не нападает.' },
    { id: 'reason', label: 'Нет времени обходить', duration: 3700, speechDelay: 150,
      speaker: 'Боксёр · про себя', voice: 'boxer',
      text: 'У меня не было времени обходить.', camera: boxer },
    { id: 'realization', label: 'И я понял…', duration: 1900, speechDelay: 100,
      speaker: 'Боксёр · про себя', voice: 'boxer', text: 'И я понял…', camera: boxer },
    { id: 'flash', label: 'Озарение', duration: 120, speaker: '', text: '',
      image: ready, imageAlt: 'Короткая вспышка озарения; злое лицо взято из того же рисунка двора.', camera: angry,
      flash: true, sounds: [{ at: 0, sound: 'impact' }] },
    { id: 'inevitable', label: 'ДРАКА НЕИЗБЕЖНА', duration: 3200, speechDelay: 100,
      speaker: 'Боксёр · про себя', voice: 'boxer', text: 'ДРАКА НЕИЗБЕЖНА!', camera: angry,
      shots: [
        { at: 0, image: ready, imageAlt: 'Злое лицо Боксёра крупно, кадрирование рисунка с боевой стойкой во дворе.', camera: angry },
        { at: 200, image: ready, imageAlt: 'Во время «ДРАКА НЕИЗБЕЖНА» камера отъезжает от лица, раскрывая кулаки Боксёра и растерянного Рабочего с лопатой.', camera: angry, cameraEnd: wide },
        { at: 1600, image: ready, imageAlt: 'Общий план: Боксёр первым поднял кулаки, Рабочий не нападает и стоит на сухом покрытии.', camera: wide },
      ] },
    { id: 'fight', label: 'Боксёр против Рабочего', duration: 2500,
      speaker: '', text: '', camera: wide, image: ready,
      imageAlt: 'Боксёр в боевой стойке перед растерянным Рабочим. Бой ещё не начался.', fight: true },
  ],
};
