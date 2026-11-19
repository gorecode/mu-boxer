import type { Scene } from './scene.ts';

const art = (name: string): string => `${import.meta.env?.BASE_URL ?? './'}art/${name}.webp`;
const wide = { scale: 1, x: 50, y: 50 };
const boxer = { scale: 1.45, x: 0, y: 25 };
const worker = { scale: 1.45, x: 100, y: 25 };
const door = { scale: 1.35, x: 100, y: 25 };
const corner = { scale: 1.35, x: 0, y: 25 };
const courtyard = art('worker-wide-v2');
const angry = art('boxer-angry');
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
    { id: 'reason', label: 'Обходить весь район', duration: 5600, speechDelay: 150,
      speaker: 'Боксёр · про себя', voice: 'boxer',
      text: 'У меня не было времени обходить весь район. Поэтому…', camera: door,
      shots: [
        { at: 0, image: courtyard, imageAlt: 'Всего несколько шагов до двери участкового.', camera: door },
        { at: 500, image: courtyard, imageAlt: 'Камера переводит внимание от близкой двери к углу дома, за которым скрывается обход.', camera: door, cameraEnd: corner },
        { at: 2600, image: courtyard, imageAlt: 'Угол дома: обход уходит за пределы кадра.', camera: corner },
        { at: 3800, image: angry, imageAlt: 'На «Поэтому» — злое лицо Боксёра крупно, по эталону сцены участкового.', camera: wide },
      ] },
    { id: 'forced', label: 'Я БЫЛ ВЫНУЖДЕН', duration: 4000, speechDelay: 150,
      speaker: 'Боксёр · про себя', voice: 'boxer', text: 'Я БЫЛ ВЫНУЖДЕН… начать драку.', camera: wide,
      shots: [
        { at: 0, image: angry, imageAlt: 'Боксёр со злым лицом убеждён в собственной правоте.', camera: wide },
        { at: 1600, image: ready, imageAlt: 'Боксёр первым поднял кулаки. Растерянный Рабочий держит лопату, не замахиваясь; лента между ними.', camera: wide },
      ] },
    { id: 'fight', label: 'Боксёр против Рабочего', duration: 2500,
      speaker: '', text: '', camera: wide, image: ready,
      imageAlt: 'Боксёр в боевой стойке перед растерянным Рабочим. Бой ещё не начался.', fight: true },
  ],
};
