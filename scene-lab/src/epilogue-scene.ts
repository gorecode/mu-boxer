import type { Scene } from './scene.ts';

const art = (name: string): string => `${import.meta.env?.BASE_URL ?? './'}art/${name}.webp`;
const wide = { scale: 1, x: 0, y: 15 };
const aftermath = art('epilogue-aftermath-v1');
const doorway = art('epilogue-doorway-v2');
const crumpled = art('epilogue-crumple-v1');
const discarded = art('epilogue-discard-v1');
const exit = art('epilogue-exit-v1');

export const epilogueScene: Scene = {
  id: 'epilogue', title: 'Новый герой', subtitle: 'Эпилог', opponent: '', hardCuts: true,
  intro: { location: 'МФЦ. После последнего боя.', title: 'Сегодня я выиграл.' },
  image: aftermath, imageAlt: 'Спокойный Боксёр с бланком. Бандит лежит возле разломанного стола.',
  cues: [
    { id: 'won', label: 'Свой турнир', duration: 5300, speechDelay: 150,
      speaker: 'Боксёр · рассказ', voice: 'boxer', text: 'Сегодня свой турнир по боксу я выиграл.', camera: wide,
      shots: [
        { at: 0, image: aftermath, imageAlt: 'Спокойное лицо Боксёра после победы. Бандит пока вне кадра.', camera: { scale: 2.5, x: 0, y: 15 } },
        { at: 400, image: aftermath, imageAlt: 'Камера отходит во время рассказа, раскрывая поверженного Бандита и разломанный стол. У героя бланк.', camera: { scale: 2.5, x: 0, y: 15 }, cameraEnd: wide },
        { at: 2800, image: aftermath, imageAlt: 'Последствия последнего боя раскрыты. Боксёр спокойно держит бланк, Бандит лежит. Выдержка.', camera: wide },
      ] },
    { id: 'tomorrow', label: 'Районный завтра', duration: 3500, speechDelay: 100,
      speaker: 'Боксёр · рассказ', voice: 'boxer', text: 'И завтра выиграю районный.', camera: wide },
    { id: 'but', label: 'Но…', duration: 1700, speechDelay: 200,
      speaker: 'Боксёр · рассказ', voice: 'boxer', text: 'Но…', camera: wide, image: doorway,
      imageAlt: 'Герой остановился у публичного выхода МФЦ с целым бланком в левой руке. Он задумался.' },
    { id: 'city', label: 'Город прогнил', duration: 3800, speechDelay: 100,
      speaker: 'Боксёр · рассказ', voice: 'boxer', text: 'Этот город прогнил насквозь.', camera: wide, image: doorway },
    { id: 'people', label: 'Все эти люди', duration: 2400, speechDelay: 150,
      speaker: 'Боксёр · рассказ', voice: 'boxer', text: 'Все эти люди.', camera: wide, image: art('worker-wide-v2'),
      imageAlt: 'Воспоминание: обычный Рабочий с лопатой у ленты. Для Боксёра он часть прогнившего города.' },
    { id: 'officials', label: 'Продажные чиновники', duration: 2600, speechDelay: 150,
      speaker: 'Боксёр · рассказ', voice: 'boxer', text: 'Продажные чиновники.', camera: wide, image: art('precinct-idle'),
      imageAlt: 'Воспоминание: Участковый в кабинете до звонка. Никакой взятки на рисунке нет.' },
    { id: 'judges', label: 'Судьи', duration: 1800, speechDelay: 150,
      speaker: 'Боксёр · рассказ', voice: 'boxer', text: 'Судьи.', camera: wide, image: art('intro-court-v2'),
      imageAlt: 'Карикатурный злой судья из рассказа о прошлом.' },
    { id: 'bandits', label: 'Бандиты', duration: 2100, speechDelay: 150,
      speaker: 'Боксёр · рассказ', voice: 'boxer', text: 'Бандиты.', camera: wide, image: art('animator-wide-v2'),
      imageAlt: 'Воспоминание: Аниматор с улыбкой ростового костюма протягивает листовку. Герой причислил его к бандитам.' },
    { id: 'hero', label: 'Новый герой', duration: 4200, speechDelay: 150,
      speaker: 'Боксёр · рассказ', voice: 'boxer', text: 'Этому городу нужен новый герой.', camera: wide,
      shots: [
        { at: 0, image: doorway, imageAlt: 'Боксёр у выхода принял решение, бланк ещё целый в левой руке.', camera: wide, cameraEnd: { scale: 1.18, x: 0, y: 15 } },
        { at: 2800, image: doorway, imageAlt: 'Герой решителен. Небольшой наезд окончен; бумага пока в руке, ведро рядом.', camera: { scale: 1.18, x: 0, y: 15 } },
      ] },
    { id: 'law', label: 'Уважать закон', duration: 5300, speechDelay: 100,
      speaker: 'Боксёр · рассказ', voice: 'boxer', text: 'Который научит ценить и уважать закон…', camera: wide, image: crumpled,
      imageAlt: 'Тот же ракурс у выхода: Боксёр скомкал бланк в левой руке над ведром. Ведро ещё без этого бланка.' },
    { id: 'discard', label: 'Бланк в ведро', duration: 800, speaker: '', text: '', camera: wide, image: discarded,
      imageAlt: 'Левая ладонь разжата над ведром, единственный скомканный бланк уже внутри. Герой отказывается от прежней цели.',
      sounds: [{ at: 0, sound: 'paper' }] },
    { id: 'order', label: 'И порядок', duration: 3300, speechDelay: 100,
      speaker: 'Боксёр · рассказ', voice: 'boxer', text: 'И порядок.', camera: wide, image: exit,
      imageAlt: 'Герой уходит из МФЦ со сжатыми пустыми кулаками. Камера остаётся среди разгрома; бланк в ведре.' },
    { id: 'end', label: 'Конец', duration: 2200, speaker: '', text: '', camera: wide, image: exit,
      titleCard: { eyebrow: 'МЕСТЬ БОКСЁРА II', title: 'КОНЕЦ' } },
  ],
};
