import { compileScene, type Scene } from './scene.ts';

const wide = { scale: 1, x: 50, y: 50 };
const boxer = { scale: 2.2, x: 15, y: 9 };
const officer = { scale: 1.85, x: 80, y: 38 };
const precinct: Scene = {
  id: 'precinct',
  title: 'Вы пока посидите',
  subtitle: 'Глава 02 · Участковый',
  image: `${import.meta.env?.BASE_URL ?? './'}art/precinct.webp`,
  imageAlt: 'Боксёр с бетоном на ботинках стоит у стола участкового. Участковый слушает телефон. На полу следы.',
  opponent: 'Участковый',
  cues: [
    { id: 'arrival', label: 'За справкой', duration: 6800, speaker: 'Боксёр', camera: wide,
      text: 'Для участия в турнире мне понадобилась справка об отсутствии судимости. Турнир был завтра.' },
    { id: 'explanation', label: 'Свои люди', duration: 5600, speaker: 'Боксёр', camera: boxer,
      text: 'Я решил начать с участкового. Он знал мою историю и должен был помочь.', sounds: [{ at: 300, sound: 'paper' }] },
    { id: 'request', label: 'Невиновность', duration: 4300, speaker: 'Боксёр · вслух', camera: wide,
      text: '— Мне справку об отсутствии судимости. На турнир.' },
    { id: 'surname', label: 'Фамилия', duration: 3000, speaker: 'Участковый', camera: officer,
      text: '— Фамилию вашу?' },
    { id: 'call', label: 'Звонок', duration: 3800, speaker: '', camera: wide, text: '',
      sounds: [{ at: 150, sound: 'ring' }, { at: 1450, sound: 'ring' }, { at: 2900, sound: 'receiver' }] },
    { id: 'report', label: 'Во дворе', duration: 4800, speaker: 'Участковый · в трубку', camera: officer,
      text: '— Да. Где именно? Во дворе? Дворника?' },
    { id: 'shoes', label: 'Приметы', duration: 4000, speaker: 'Участковый · в трубку',
      camera: { scale: 2.3, x: 7, y: 100 }, text: '— А приметы какие?' },
    { id: 'recognition', label: 'Он у меня', duration: 3200, speaker: 'Участковый · в трубку', camera: officer,
      text: '— Понятно. Он у меня.', sounds: [{ at: 2300, sound: 'receiver' }] },
    { id: 'suspicion', label: 'Опять подстава', duration: 6500, speaker: 'Боксёр', camera: boxer,
      text: 'Я пришёл подтвердить свою невиновность. Но участковый уже кому-то сообщил, что поймал меня.' },
    { id: 'sit', label: 'Посидите', duration: 3000, speaker: 'Участковый', camera: officer,
      text: '— Вы пока посидите.', sounds: [{ at: 1500, sound: 'chair' }] },
    { id: 'refusal', label: 'Второй раз', duration: 4200, speaker: 'Боксёр', camera: boxer,
      text: 'Сесть ещё раз я не собирался.', sounds: [{ at: 2200, sound: 'impact' }] },
    { id: 'fight', label: 'Перед боем', duration: 2400, speaker: '', camera: wide, text: '', fight: true },
  ],
};

export const scenes = [compileScene(precinct)];
