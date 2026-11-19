import type { Camera, Cue, Scene } from './scene.ts';
import { planSpeech } from './speech.ts';

const art = (name: string): string => `${import.meta.env?.BASE_URL ?? './'}art/${name}.webp`;
const wide = { scale: 1, x: 50, y: 50 };
const gymFace = { scale: 2.65, x: 31, y: 17 };
const shots = (text: string, entries: [string, string, string, Camera, Camera?][]): NonNullable<Cue['shots']> => {
  const speech = planSpeech(text);
  return entries.map(([word, image, imageAlt, camera, cameraEnd]) => {
    const index = text.indexOf(word);
    if (index < 0) throw new Error(`Нет слова для монтажной склейки: ${word}`);
    return { at: word ? speech.letters.find((letter) => letter.end > index)!.at : 0,
      image: art(image), imageAlt, camera, cameraEnd };
  });
};
function narration(id: string, label: string, text: string, entries: Parameters<typeof shots>[1], hold = 250): Cue {
  return { id, label, text, speaker: 'Боксёр · рассказ', voice: 'boxer', camera: wide,
    duration: Math.ceil((planSpeech(text).duration + hold) / 100) * 100, shots: shots(text, entries) };
}

export const intro: Scene = {
  id: 'intro', title: 'Моё прошлое', subtitle: 'Пролог · Рассказ Боксёра',
  intro: { location: 'Московский криминалитет', title: 'Моё прошлое' },
  image: art('intro-gym-v3'), imageAlt: 'Боксёр в старом зале у груши. За его плечом — канаты ринга.',
  opponent: '', hardCuts: true,
  cues: [
    narration('murder', 'Лучший друг', 'Когда-то убили моего лучшего друга.', [
      ['', 'intro-gym-v3', 'Угрюмое лицо Боксёра, за плечом канаты ринга.', gymFace, { ...gymFace, scale: 2.85 }],
    ]),
    narration('pistol', 'Пистолет в кармане', 'А пистолет нашли у меня в кармане. Как он туда попал, я не знал.', [
      ['', 'intro-arrest', 'Милиционер с найденным пистолетом и растерянный Боксёр на улице.', wide],
      ['пистолет', 'intro-arrest', 'Крупно пистолет, найденный в одежде Боксёра.', { scale: 2.5, x: 68, y: 19 }, { scale: 2.65, x: 68, y: 19 }],
      ['Как', 'intro-arrest', 'Растерянное лицо Боксёра: он смотрит на найденное оружие.', { scale: 2.25, x: 19, y: 13 }, { scale: 2.4, x: 19, y: 13 }],
    ]),
    narration('prison', 'Суд и тюрьма', 'Суд не стал слушать. И меня посадили в тюрьму.', [
      ['', 'intro-court-v2', 'Злой судья из прежнего интро не желает слушать Боксёра.', { scale: 1.8, x: 97, y: 15 }, { scale: 1.95, x: 97, y: 15 }],
      ['И', 'intro-cell-v3', 'Боксёр за решёткой; в глубине камеры лысый бородатый Авторитет стоит руки в боки.', wide, { scale: 1.08, x: 34, y: 30 }],
    ]),
    narration('escape', 'Побег и Москва', 'Но я сбежал. И вернулся в Москву, чтобы найти убийцу.', [
      ['', 'intro-escape-v3', 'Окно без решётки, следы ремонта, избитый милиционер и Боксёр на внешней ограде тюрьмы.', wide, { scale: 1.15, x: 90, y: 27 }],
      ['И', 'intro-road-v3', 'Боксёр идёт по дороге спиной к зрителю: указатель «Москва» и город на горизонте.', wide, { scale: 1.1, x: 53, y: 30 }],
    ]),
    narration('obstacles', 'Весь мир против меня', 'Но весь мир был против меня. Каждый встречный пытался мне помешать.', [
      ['', 'intro-driver-v3', 'Поверженный Шофёр сидит у фуры на заправке. Боксёр стоит рядом.', { scale: 1.45, x: 10, y: 58 }, wide],
      ['меня.', 'intro-biker-v3', 'Пьяный Байкер бьёт Боксёра в живот после столкновения в сквере.', wide, { scale: 1.08, x: 45, y: 40 }],
      ['встречный', 'intro-woman-v3', 'Незнакомая светловолосая девушка наступает на Боксёра на улице. В его руке пачка сигарет.', wide, { scale: 1.08, x: 65, y: 36 }],
    ]),
    narration('no-harm', 'Не хотел причинять зла', 'Я никому не хотел причинять зла.', [
      ['', 'boxer-angry', 'Злое туповатое лицо Боксёра: тяжёлая челюсть, оскаленные неровные зубы.', wide, { scale: 1.13, x: 50, y: 42 }],
    ], 650),
    narration('forced', 'Но был вынужден', 'Но был вынужден.', [
      ['', 'intro-woman-after-v3', 'Девушка сидит у стены перехода. Боксёр уже уходит вверх по лестнице.', wide, { scale: 1.08, x: 71, y: 30 }],
    ], 300),
    narration('culprit', 'Добрался до мерзавца', 'Преодолев все трудности, я добрался до мерзавца, который меня подставил.', [
      ['', 'intro-controller-v3', 'Сначала серьёзное лицо Боксёра, затем поверженный Контролёр, сумка и билеты у открытых дверей троллейбуса.', { scale: 2.5, x: 25, y: 10 }, wide],
      ['до мерзавца', 'intro-billiards-v3', 'Бандит в нокауте у бильярдного стола, кий на полу. Боксёр звонит в милицию.', { scale: 1.3, x: 0, y: 65 }, { scale: 1.6, x: 100, y: 18 }],
    ]),
    narration('acquittal', 'Оправдание и бокс', 'Меня оправдали. Я снова стал заниматься боксом.', [
      ['', 'intro-acquittal-v3', 'Тот же недовольный судья передаёт Боксёру бумагу. Боксёр принимает её с каменным лицом.', wide, { scale: 1.1, x: 48, y: 40 }],
      ['Я', 'intro-gym-v3', 'Боксёр снова бьёт грушу: камера от лица раскрывает перчатки, грушу и канаты ринга.', gymFace, wide],
    ], 800),
  ],
};
