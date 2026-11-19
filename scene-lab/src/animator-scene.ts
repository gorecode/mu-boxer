import type { Scene } from './scene.ts';

const art = (name: string, version = 1): string => `${import.meta.env?.BASE_URL ?? './'}art/animator-${name}-v${version}.webp`;
const wide = { scale: 1, x: 16, y: 3 };
const boxer = { scale: 1.7, x: 0, y: 0 };
const rabbit = { scale: 1.55, x: 100, y: 0 };
const angry = { scale: 3.3, x: 16, y: 3 };
const ready = art('ready');

export const animator: Scene = {
  id: 'animator', title: 'Улыбку убери', subtitle: 'Глава 03 · Аниматор',
  intro: { location: 'После боя с Участковым. Дорога к МФЦ.', title: 'Где здесь МФЦ?' },
  image: art('wide'), imageAlt: 'Боксёр на тротуаре перед магазином. Аниматор в потёртом костюме Зайца предлагает листовку; на голове костюма неподвижная улыбка.',
  opponent: 'Аниматора', hardCuts: true,
  cues: [
    { id: 'memo', label: 'Участковый знал', duration: 5800, speechDelay: 250,
      speaker: 'Боксёр · рассказ', voice: 'boxer', text: 'Как я и предполагал, участковый знал, куда мне нужно.',
      camera: wide,
      image: art('memo', 2), imageAlt: 'Памятка на столе участкового: «СПРАВКИ ОБ ОТСУТСТВИИ СУДИМОСТИ ВЫДАЮТСЯ В МФЦ!»',
      sounds: [{ at: 100, sound: 'paper' }] },
    { id: 'street', label: 'По дороге к МФЦ', duration: 700, speaker: '', text: '', camera: wide,
      setting: 'По дороге к МФЦ. У магазина.' },
    { id: 'directions', label: 'Где здесь МФЦ?', duration: 1800, speechDelay: 100,
      speaker: 'Боксёр', voice: 'boxer', text: 'Где здесь МФЦ?', camera: boxer },
    { id: 'leaflet', label: 'Приведи друга', duration: 2000, speaker: '', text: '', camera: wide,
      image: art('leaflet'), imageAlt: 'Мягкая лапа протягивает листовку с надписью «ПРИВЕДИ ДРУГА — ПОЛУЧИ ПОДАРОК!»',
      sounds: [{ at: 100, sound: 'paper' }] },
    { id: 'friend', label: 'Моего друга убили', duration: 2600, speechDelay: 100,
      speaker: 'Боксёр', voice: 'boxer', text: 'Моего друга убили.', camera: boxer },
    { id: 'smile', label: 'Та же улыбка', duration: 850, speaker: '', text: '', camera: rabbit },
    { id: 'command', label: 'Улыбку убери', duration: 3300, speechDelay: 100,
      speaker: 'Боксёр', voice: 'boxer', text: 'Тебе смешно? Улыбку убери.', camera: boxer },
    { id: 'gesture', label: 'Это голова костюма', duration: 900, speaker: '', text: '', camera: rabbit,
      image: art('gesture'), imageAlt: 'Заяц указывает мягкой лапой на собственную нарисованную улыбку, пытаясь объяснить устройство костюма. Лапа не направлена к Боксёру; замаха нет.' },
    { id: 'innocent', label: 'Ничего плохого не сказал', duration: 3500, speechDelay: 100,
      speaker: 'Боксёр · про себя', voice: 'boxer', text: 'Я ничего плохого ему не сказал.', camera: rabbit,
      image: art('gesture'), imageAlt: 'Аниматор безобидно показывает на голову костюма. Улыбка не меняется.' },
    { id: 'raised-hand', label: 'Поднял на меня руку', duration: 3400, speechDelay: 100,
      speaker: 'Боксёр · про себя', voice: 'boxer', text: 'А он уже поднял на меня руку.', camera: boxer },
    { id: 'reaction', label: 'Нелепый вывод', duration: 650, speaker: '', text: '', camera: angry,
      image: ready, imageAlt: 'Злое лицо того же Боксёра на тротуаре. Крупный план из рисунка с его поднятыми кулаками.' },
    { id: 'forced', label: 'Вынужден защищаться', duration: 3200, speechDelay: 100,
      speaker: 'Боксёр · про себя', voice: 'boxer', text: 'Я был вынужден защищаться.', camera: angry,
      shots: [
        { at: 0, image: ready, imageAlt: 'Злое лицо Боксёра крупно. Рассказ о самозащите звучит спокойно.', camera: angry },
        { at: 200, image: ready, imageAlt: 'Камера раскрывает поднятые кулаки Боксёра и Зайца, который всё ещё объясняется жестом к своей голове.', camera: angry, cameraEnd: wide },
        { at: 1800, image: ready, imageAlt: 'Общий план: первым к драке готов Боксёр. Заяц не нападает.', camera: wide },
      ] },
    { id: 'brick', label: 'Листовки не разлетятся', duration: 1700, speaker: '', text: '', camera: wide,
      image: art('brick'), imageAlt: 'Аниматор кладёт кирпич на стопку листовок на тротуаре. Кирпич прижимает бумагу, а не служит оружием.',
      sounds: [{ at: 150, sound: 'paper' }, { at: 900, sound: 'chair' }] },
    { id: 'settle', label: 'Улыбка осталась', duration: 1400, speaker: '', text: '', camera: wide,
      image: art('final'), imageAlt: 'Заяц снова выпрямился, лапы опущены; листовки лежат под кирпичом. Улыбка прежняя. Боксёр стоит с поднятыми кулаками.' },
    { id: 'fight', label: 'Боксёр против Аниматора', duration: 2500, speaker: '', text: '', camera: wide,
      image: art('final'), imageAlt: 'Боксёр против Аниматора. Кирпич остаётся на бумагах, Заяц не держит оружия.', fight: true },
  ],
};
