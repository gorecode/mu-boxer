import './style.css';
import { scenes } from './scenes.ts';
import { cueAt, readSceneLink, sceneLink, sceneImages, visualAt } from './scene.ts';
import { Timeline } from './timeline.ts';
import { SceneAudio } from './audio.ts';
import { subtitleAt } from './speech.ts';

const initial = readSceneLink(location.hash, scenes);
let timeline = new Timeline(initial.scene);
timeline.seek(initial.time);
let started = false;
let ready = false;
let muted = false;
let previous = performance.now();
let lastCue = '';
let audioGeneration = 0;
let imageGeneration = 0;
let speechKey = '';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="masthead">
    <a class="wordmark" href="#" aria-label="Месть боксёра 2, начало">МЕСТЬ БОКСЁРА <span>II</span></a>
    <span class="lab-mark"><i></i> СТЕНД СЮЖЕТНЫХ СЦЕН</span>
  </header>
  <main>
    <div class="scene-heading"><div><p class="eyebrow" id="chapter"></p><h1 id="title"></h1></div>
      <span class="version">ПРОТОТИП / 03</span></div>
    <div class="workspace">
      <section class="screen-column" aria-label="Просмотр сцены">
        <div class="stage" id="stage" tabindex="0" aria-label="Кадр сцены. Пробел — пауза, стрелки — смена кадра">
          <img id="art" alt="" draggable="false" />
          <div class="stage-shade"></div>
          <span class="frame-counter" id="frame-counter"></span>
          <span class="scene-setting" id="scene-setting" hidden></span>
          <span class="paused-mark" id="paused-mark" hidden>ПАУЗА</span>
          <div class="subtitle" id="subtitle"><span id="speaker"></span><p id="caption"><span id="caption-layout" aria-hidden="true"></span><span id="caption-typed" aria-hidden="true"></span></p></div>
          <div class="start-overlay" id="start-overlay">
            <span class="eyebrow" id="story-location"></span>
            <p class="start-title" id="story-intro"></p>
            <button class="primary" id="start" disabled>Загрузка иллюстрации…</button>
            <span class="start-note" id="story-duration"></span>
          </div>
          <div class="fight-overlay" id="fight" hidden>
            <span class="eyebrow">РАЗГОВОР НЕ СЛОЖИЛСЯ</span>
            <div class="versus"><strong>БОКСЁР</strong><em>ПРОТИВ</em><strong id="opponent"></strong></div>
            <button class="primary" id="resolve">Разобраться</button>
            <p id="fight-note" hidden>Дальше — бой. В этом стенде проверяем только сюжетную сцену.</p>
          </div>
          <div class="title-card" id="title-card" hidden>
            <span class="eyebrow" id="title-card-eyebrow"></span>
            <p id="title-card-title"></p>
          </div>
        </div>
        <div class="transport">
          <label class="sr-only" for="scrub">Позиция сцены</label>
          <input id="scrub" type="range" min="0" value="0" step="1" />
          <div class="transport-row">
            <div class="playback-buttons">
              <button class="icon-button" id="restart" aria-label="Сначала" title="Сначала (R)">↺</button>
              <button class="icon-button" id="previous" aria-label="Предыдущий кадр" title="Предыдущий кадр (←)">|‹</button>
              <button class="play-button" id="play" aria-label="Воспроизвести" title="Пауза / просмотр (Пробел)" disabled>▶</button>
              <button class="icon-button" id="next" aria-label="Следующий кадр" title="Следующий кадр (→)">›|</button>
            </div>
            <output id="clock">00:00 / 00:00</output>
            <div class="sound-controls">
              <button class="icon-button sound-button" id="mute" aria-label="Выключить звук" aria-pressed="false">ЗВУК ВКЛ</button>
              <label class="sr-only" for="volume">Громкость</label><input id="volume" type="range" min="0" max="1" step="0.05" value="0.65" />
              <button class="icon-button" id="fullscreen" aria-label="Полный экран" title="Полный экран (F)">⛶</button>
            </div>
          </div>
        </div>
        <p class="status" id="status" role="status" aria-live="polite">Серьёзный разговор. Нелепые обстоятельства.</p>
        <div class="under-screen"><span>КОМИКС · МУ-ОЗВУЧКА</span><button class="text-button" id="share">Ссылка на этот момент ↗</button></div>
      </section>
      <aside class="review-panel" aria-label="Инструменты просмотра">
        <div class="panel-header"><h2>Монтажный лист</h2><span id="cue-count"></span></div>
        <label class="field-label" for="scene-select">СЦЕНА</label><select id="scene-select"></select>
        <div class="review-settings"><label for="speed">Скорость</label><select id="speed"><option value="0.75">0,75×</option><option value="1" selected>1×</option><option value="1.25">1,25×</option><option value="1.5">1,5×</option><option value="2">2×</option></select></div>
        <ol class="cue-list" id="cues"></ol>
        <div class="panel-foot"><span class="red-dot"></span> Любой кадр можно пересмотреть отдельно.</div>
      </aside>
    </div>
    <footer><span>Турнир завтра. Боксёр ещё ничего не знает.</span><span>ПРОБЕЛ — ПАУЗА <b>·</b> ← → — КАДРЫ <b>·</b> R — СНАЧАЛА</span></footer>
  </main>`;

function element<T extends HTMLElement>(id: string): T { return document.getElementById(id) as T; }
const art = element<HTMLImageElement>('art');
const scrub = element<HTMLInputElement>('scrub');
const startButton = element<HTMLButtonElement>('start');
const playButton = element<HTMLButtonElement>('play');
const status = element<HTMLElement>('status');
const audio = new SceneAudio(() => { status.textContent = 'Звук недоступен в этом браузере. Просмотр продолжится без звука.'; });

function formatTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function populate(): void {
  const scene = timeline.scene;
  element('stage').classList.toggle('hard-cuts', !!scene.hardCuts);
  if (status.textContent?.startsWith('Не удалось загрузить иллюстрацию.')) {
    status.textContent = 'Серьёзный разговор. Нелепые обстоятельства.';
  }
  element('chapter').textContent = scene.subtitle;
  element('title').textContent = scene.title;
  element('opponent').textContent = scene.opponent.toUpperCase();
  element('story-location').textContent = scene.intro?.location ?? scene.subtitle;
  element('story-intro').textContent = scene.intro?.title ?? scene.title;
  element('story-duration').textContent = `Длительность: ${scene.duration / 1000} с · субтитры и му-озвучка`;
  element('cue-count').textContent = `${scene.cues.length} КАДРОВ`;
  scrub.max = String(scene.duration);
  const list = element('cues');
  list.replaceChildren(...scene.cues.map((cue, index) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.dataset.cue = cue.id;
    const number = document.createElement('span');
    number.className = 'cue-number';
    number.textContent = String(index + 1).padStart(2, '0');
    const label = document.createElement('span');
    label.textContent = cue.label;
    const time = document.createElement('time');
    time.textContent = formatTime(cue.start);
    button.append(number, label, time);
    button.addEventListener('click', () => seek(cue.start));
    li.append(button);
    return li;
  }));
  ready = false;
  startButton.disabled = true;
  playButton.disabled = true;
  startButton.textContent = 'Загрузка иллюстраций…';
  const generation = ++imageGeneration;
  lastCue = '';
  render();
  void Promise.all(sceneImages(scene).map((source) => new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(source));
    image.src = source;
  }))).then(() => {
    if (generation !== imageGeneration) return;
    ready = true;
    startButton.disabled = false;
    playButton.disabled = false;
    startButton.textContent = timeline.time > 0 ? 'Смотреть с этого момента' : 'Смотреть сцену';
  }).catch(() => { if (generation === imageGeneration) imageFailed(); });
}

function render(): void {
  const scene = timeline.scene;
  const cue = cueAt(scene, timeline.time);
  const index = scene.cues.indexOf(cue);
  if (lastCue !== cue.id) {
    lastCue = cue.id;
    element('speaker').textContent = cue.speaker;
    element('caption-layout').textContent = cue.text;
    element('caption').setAttribute('aria-label', cue.text);
    element('title-card-eyebrow').textContent = cue.titleCard?.eyebrow ?? '';
    element('title-card-title').textContent = cue.titleCard?.title ?? '';
    element('scene-setting').textContent = cue.setting ?? '';
    element('frame-counter').textContent = `КАДР ${String(index + 1).padStart(2, '0')} / ${scene.cues.length}`;
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-cue]')) {
      if (button.dataset.cue === cue.id) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
  }
  const visual = visualAt(scene, timeline.time, reducedMotion.matches);
  if (art.getAttribute('src') !== visual.image) art.src = visual.image;
  art.alt = visual.imageAlt;
  art.style.transform = `scale(${visual.camera.scale})`;
  art.style.transformOrigin = `${visual.camera.x}% ${visual.camera.y}%`;
  element('caption-typed').textContent = subtitleAt(cue.speech, timeline.time - cue.start);
  syncSpeech();
  element('subtitle').hidden = !started || !cue.text;
  element('fight').hidden = !started || !cue.fight;
  element('title-card').hidden = !started || !cue.titleCard;
  element('scene-setting').hidden = !started || !cue.setting || !!cue.titleCard;
  element('start-overlay').hidden = started;
  element('paused-mark').hidden = !started || timeline.playing || !!cue.fight || !!cue.titleCard;
  playButton.textContent = timeline.playing ? 'Ⅱ' : '▶';
  playButton.setAttribute('aria-label', timeline.playing ? 'Пауза' : 'Воспроизвести');
  element<HTMLButtonElement>('previous').disabled = timeline.time === 0;
  element<HTMLButtonElement>('next').disabled = index === scene.cues.length - 1;
  scrub.value = String(timeline.time);
  scrub.style.setProperty('--progress', `${timeline.time / scene.duration * 100}%`);
  element('clock').textContent = `${formatTime(timeline.time)} / ${formatTime(scene.duration)}`;
}

function pause(): void {
  audioGeneration++;
  timeline.pause();
  void audio.setActive(false);
  render();
}

async function play(): Promise<void> {
  if (!ready) return;
  if (timeline.playing) { pause(); return; }
  const generation = ++audioGeneration;
  started = true;
  element('fight-note').hidden = true;
  element<HTMLButtonElement>('resolve').hidden = false;
  await audio.setActive(true);
  if (generation !== audioGeneration) return;
  timeline.play();
  previous = performance.now();
  render();
}

function seek(time: number): void {
  pause();
  timeline.seek(time);
  started = true;
  element('fight-note').hidden = true;
  element<HTMLButtonElement>('resolve').hidden = false;
  history.replaceState(null, '', sceneLink(timeline.scene, time));
  render();
}

function move(direction: -1 | 1): void {
  const cues = timeline.scene.cues;
  const current = cues.indexOf(cueAt(timeline.scene, timeline.time));
  seek(cues[Math.max(0, Math.min(cues.length - 1, current + direction))].start);
}

function imageFailed(): void {
  imageGeneration++;
  pause();
  ready = false;
  startButton.disabled = true;
  playButton.disabled = true;
  startButton.textContent = 'Иллюстрация не загрузилась';
  status.textContent = 'Не удалось загрузить иллюстрацию. Обновите страницу, чтобы попробовать снова.';
}
art.addEventListener('error', imageFailed);

function syncSpeech(force = false): void {
  if (!timeline.playing) { speechKey = ''; return; }
  const cue = cueAt(timeline.scene, timeline.time);
  const key = `${cue.id}:${timeline.rate}`;
  if (!force && key === speechKey) return;
  speechKey = key;
  audio.speak(cue.speech, timeline.time - cue.start, timeline.rate);
}
startButton.addEventListener('click', () => { void play(); element('stage').focus(); });
playButton.addEventListener('click', () => { void play(); });
element('restart').addEventListener('click', () => { seek(0); void play(); });
element('previous').addEventListener('click', () => move(-1));
element('next').addEventListener('click', () => move(1));
scrub.addEventListener('input', () => seek(Number(scrub.value)));
element<HTMLSelectElement>('speed').addEventListener('change', (event) => {
  timeline.setRate(Number((event.target as HTMLSelectElement).value));
  syncSpeech(true);
});
element<HTMLInputElement>('volume').addEventListener('input', (event) => {
  audio.setVolume(Number((event.target as HTMLInputElement).value));
});
function toggleMute(): void {
  muted = !muted;
  void audio.setMuted(muted).then(() => syncSpeech(true));
  const button = element('mute');
  button.textContent = muted ? 'ЗВУК ВЫКЛ' : 'ЗВУК ВКЛ';
  button.setAttribute('aria-pressed', String(muted));
  button.setAttribute('aria-label', muted ? 'Включить звук' : 'Выключить звук');
}
element('mute').addEventListener('click', toggleMute);
async function fullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await element('stage').requestFullscreen();
  } catch { status.textContent = 'Полный экран недоступен в этом браузере.'; }
}
element('fullscreen').addEventListener('click', () => { void fullscreen(); });
element('share').addEventListener('click', () => {
  const hash = sceneLink(timeline.scene, timeline.time);
  history.replaceState(null, '', hash);
  void navigator.clipboard?.writeText(location.href).then(() => {
    status.textContent = 'Ссылка на текущий момент скопирована.';
  }).catch(() => { status.textContent = 'Ссылка на текущий момент — в адресной строке.'; });
  status.textContent = 'Ссылка на текущий момент — в адресной строке.';
});
element('resolve').addEventListener('click', () => {
  pause();
  element('fight-note').hidden = false;
  element('resolve').hidden = true;
});
const select = element<HTMLSelectElement>('scene-select');
for (const scene of scenes) select.add(new Option(scene.title, scene.id));
select.value = timeline.scene.id;
select.addEventListener('change', () => {
  pause();
  timeline = new Timeline(scenes.find((scene) => scene.id === select.value)!);
  timeline.setRate(Number(element<HTMLSelectElement>('speed').value));
  started = false;
  history.replaceState(null, '', sceneLink(timeline.scene, 0));
  populate();
});
window.addEventListener('hashchange', () => {
  const target = readSceneLink(location.hash, scenes);
  if (target.scene.id !== timeline.scene.id) {
    pause(); timeline = new Timeline(target.scene);
    timeline.setRate(Number(element<HTMLSelectElement>('speed').value));
    select.value = target.scene.id; populate();
  }
  seek(target.time);
});
window.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.altKey || event.metaKey || event.target instanceof HTMLElement && event.target.closest('input, select, button, a, textarea, [contenteditable]')) return;
  if (event.code === 'Space') { event.preventDefault(); void play(); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
  if (event.code === 'KeyR') { seek(0); void play(); }
  if (event.code === 'KeyM') toggleMute();
  if (event.code === 'KeyF') void fullscreen();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('pagehide', (event) => { pause(); if (!event.persisted) audio.dispose(); });
function frame(now: number): void {
  const wasPlaying = timeline.playing;
  const sounds = timeline.advance(Math.max(0, now - previous));
  for (const sound of sounds) audio.play(sound);
  if (wasPlaying && !timeline.playing) void audio.setActive(false);
  previous = now;
  render();
  requestAnimationFrame(frame);
}
populate();
requestAnimationFrame(frame);
