import './style.css';
import { createLayerTimeline, duration, nativeLayers, reducedLayers } from './motion.ts';
import { compileScene } from '../../scene.ts';
import { Timeline } from '../../timeline.ts';

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const play = element<HTMLButtonElement>('play');
const restart = element<HTMLButtonElement>('restart');
const seek = element<HTMLInputElement>('seek');
const engine = element<HTMLSelectElement>('engine');
const lead = element<HTMLSelectElement>('lead');
const city = element<HTMLImageElement>('city');
const status = element('status');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const params = new URLSearchParams(location.search);
engine.value = params.get('engine') === 'native' ? 'native' : 'gsap';
lead.value = params.get('lead') === '1300' ? '1300' : '800';
let track = createLayerTimeline(Number(lead.value));
function player(): Timeline {
  return new Timeline(compileScene({ id: 'layers', title: '', subtitle: '', image: '', imageAlt: '', opponent: '',
    cues: [{ id: 'all', label: '', duration: duration(Number(lead.value)), speaker: '', text: '', camera: { scale: 1, x: 0, y: 0 } }] }));
}
let clock = player();
let previous = performance.now();
let ready = false;

function render(): void {
  const state = reduced.matches ? reducedLayers(clock.time, Number(lead.value))
    : engine.value === 'gsap' ? track.at(clock.time) : nativeLayers(clock.time, Number(lead.value));
  city.style.transform = `translateX(${state.city}%)`;
  element('rail').style.transform = `translateX(${state.rail}%) rotate(-4deg)`;
  element('paper').style.transform = `translateY(${state.paper}%) rotate(${state.angle}deg)`;
  element('stamp').style.transform = `rotate(-12deg) scale(${state.stamp})`;
  element('stamp').style.opacity = String(state.ink);
  element('black').style.opacity = String(state.black);
  seek.max = String(clock.scene.duration);
  seek.value = String(clock.time);
  element('time').textContent = `${(clock.time / 1000).toFixed(2)} / ${(clock.scene.duration / 1000).toFixed(2)} с`;
  play.textContent = clock.playing ? 'Пауза' : 'Смотреть';
}
function pause(): void { clock.pause(); render(); }
play.addEventListener('click', () => {
  if (!ready) return;
  if (clock.playing) pause();
  else { clock.play(); previous = performance.now(); render(); }
});
restart.addEventListener('click', () => { clock.seek(0); pause(); });
seek.addEventListener('input', () => { clock.seek(Number(seek.value)); pause(); });
engine.addEventListener('change', pause);
lead.addEventListener('change', () => {
  pause();
  const time = clock.time;
  const rate = clock.rate;
  track.dispose();
  track = createLayerTimeline(Number(lead.value));
  clock = player(); clock.setRate(rate); clock.seek(time); render();
});
element<HTMLSelectElement>('speed').addEventListener('change', event => clock.setRate(Number((event.target as HTMLSelectElement).value)));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('pagehide', event => { pause(); if (!event.persisted) track.dispose(); });
void city.decode().then(() => {
  ready = true; play.disabled = false; restart.disabled = false;
  status.textContent = 'Без звука · единые часы просмотра · reduced motion поддерживается';
}).catch(() => { status.textContent = 'Иллюстрация не загрузилась. Обновите страницу, чтобы повторить.'; });
function frame(now: number): void {
  clock.advance(Math.max(0, now - previous)); previous = now;
  render(); requestAnimationFrame(frame);
}
render(); requestAnimationFrame(frame);
