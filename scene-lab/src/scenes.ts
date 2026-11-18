import { compileScene, type Scene } from './scene.ts';

const art = (name: string): string => `${import.meta.env?.BASE_URL ?? './'}art/${name}.webp`;
const wide = { scale: 1, x: 50, y: 50 };
const precinct: Scene = {
  id: 'precinct', title: 'Вы пока посидите', subtitle: 'Глава 02 · Участковый',
  image: art('precinct-idle'),
  imageAlt: 'Боксёр стоит перед участковым. Трубка лежит на телефоне. На ботинках и полу свежий бетон.',
  opponent: 'Участковый',
  cues: [
    { id: 'request', label: 'За справкой', duration: 4000, speaker: 'Боксёр', voice: 'boxer', camera: wide,
      text: 'Мне справку, что я не судимый.' },
    { id: 'call', label: 'Звонок', duration: 2000, speaker: '', camera: wide, text: '',
      sounds: [{ at: 100, sound: 'ring' }, { at: 1750, sound: 'receiver' }] },
    { id: 'report', label: 'Дворника избили?', duration: 4000, speaker: 'Участковый · в трубку', voice: 'officer',
      image: art('precinct'), imageAlt: 'Участковый слушает трубку и подозрительно смотрит на посетителя.',
      camera: { scale: 1.6, x: 85, y: 35 }, text: 'Дворника избили? Приметы?' },
    { id: 'clue', label: 'Ноги в бетоне?', duration: 1800, speaker: 'Участковый · в трубку', voice: 'officer',
      image: art('precinct'), imageAlt: 'Участковый уточняет приметы, слушая телефонную трубку.',
      camera: { scale: 1.6, x: 85, y: 35 }, text: 'Ноги в бетоне?' },
    { id: 'shoes', label: 'Бетонные ботинки', duration: 1200, speaker: '', text: '', image: art('precinct'),
      imageAlt: 'Крупный план ботинок боксёра со свежим бетоном и следов на полу.', camera: { scale: 2.3, x: 7, y: 100 } },
    { id: 'recognition', label: 'Посидите', duration: 3000, speaker: 'Участковый', voice: 'officer',
      image: art('precinct'), imageAlt: 'Участковый с трубкой смотрит прямо на боксёра.',
      camera: { scale: 1.85, x: 80, y: 38 }, text: 'Понятно. Вы пока посидите.', sounds: [{ at: 2750, sound: 'receiver' }] },
    { id: 'thinking', label: 'Размышление', duration: 1000, speaker: '', text: '',
      image: art('boxer-thinking'), imageAlt: 'Обычное лицо боксёра крупным планом: рот закрыт, взгляд в сторону, он молча обдумывает услышанное.',
      camera: wide },
    { id: 'refusal', label: 'Сесть ещё раз', duration: 4000, speaker: 'Боксёр · про себя', voice: 'boxer-angry',
      image: art('boxer-angry'), imageAlt: 'Разъярённое угловатое лицо боксёра: сведённые брови, злые глаза, стиснутые неровные зубы.',
      camera: wide, text: 'Сесть ещё раз я не собирался.', sounds: [{ at: 0, sound: 'impact' }] },
    { id: 'fight', label: 'Перед боем', duration: 3000, speaker: '', camera: wide, text: '', fight: true,
      image: art('boxer-angry'), imageAlt: 'Разъярённый боксёр перед боем с участковым.' },
  ],
};

export const scenes = [compileScene(precinct)];
