import type { Scene } from './scene.ts';

const art = (name: string): string => `${import.meta.env?.BASE_URL ?? './'}art/${name}.webp`;
const wide = { scale: 1, x: 50, y: 50 };
export const queue: Scene = {
  id: 'queue', title: 'Только через мой труп', subtitle: 'Глава 06 · Бабка',
  intro: { location: 'Приёмная. Электронная очередь.', title: 'Меня вызвали.' },
  image: art('queue-wide'),
  imageAlt: 'Боксёр идёт к окну приёма. Бабка в берете перекрывает проход клетчатой сумкой на колёсиках.',
  opponent: 'Бабки',
  cues: [
    { id: 'ticket', label: 'Талон № 111', duration: 1500, speaker: '', text: '', camera: wide,
      image: art('queue-ticket'), imageAlt: 'Крупный план талона с номером 111 в руке боксёра.',
      sounds: [{ at: 100, sound: 'paper' }] },
    { id: 'called', label: 'Вызван № 111', duration: 1500, speaker: '', text: '',
      imageAlt: 'На электронном табло горит вызванный номер 111.', camera: { scale: 1.55, x: 85, y: 10 },
      sounds: [{ at: 0, sound: 'queue-chime' }] },
    { id: 'claim', label: 'Я занимала', duration: 2000, speaker: 'Бабка', voice: 'grandma', text: 'Я занимала.',
      image: art('queue-grandma'), imageAlt: 'Недовольная бабка в берете держит ручку сумки, не пропуская боксёра.', camera: wide },
    { id: 'answer', label: 'Меня вызвали', duration: 2000, speaker: 'Боксёр', voice: 'boxer', text: 'Меня вызвали.', camera: wide },
    { id: 'priority', label: 'До тебя', duration: 3000, speaker: 'Бабка', voice: 'grandma', text: 'Я ещё до тебя занимала.',
      image: art('queue-grandma'), camera: wide },
    { id: 'block', label: 'Сумка поперёк', duration: 1000, speaker: '', text: '', camera: { scale: 1.8, x: 72, y: 100 },
      imageAlt: 'Сумка на колёсиках стоит поперёк прохода перед боксёром.', sounds: [{ at: 0, sound: 'chair' }] },
    { id: 'ultimatum', label: 'Через мой труп', duration: 4000, speaker: 'Бабка', voice: 'grandma',
      text: 'Мужчина. Только через мой труп.', image: art('queue-grandma'), camera: wide },
    { id: 'thinking', label: 'Убивать не собирался', duration: 4500, speaker: 'Боксёр · про себя', voice: 'boxer',
      text: 'Убивать эту женщину я не собирался.', image: art('boxer-thinking'),
      imageAlt: 'Обычное лицо боксёра: он серьёзно обдумывает предложенные условия.', camera: wide },
    { id: 'forced', label: 'Я был вынужден', duration: 4500, speaker: 'Боксёр · про себя', voice: 'boxer',
      text: 'Поэтому я был вынужден начать драку.', image: art('queue-boxer-ready'),
      imageAlt: 'Боксёр первым поднимает кулаки. Бабка за сумкой ещё не нападает.', camera: wide,
      sounds: [{ at: 0, sound: 'impact' }] },
    { id: 'fight', label: 'Перед боем', duration: 3000, speaker: '', text: '', camera: wide, fight: true,
      image: art('queue-boxer-ready'), imageAlt: 'Боксёр с поднятыми кулаками перед боем с бабкой.' },
  ],
};
