import { expect, test } from '@playwright/test';

interface AudioWindow extends Window { audioContexts: (AudioContext & { meter: AnalyserNode })[] }

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const browser = window as unknown as AudioWindow;
    browser.audioContexts = [];
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor() {
        super();
        const meter = this.createAnalyser();
        meter.fftSize = 2048;
        const context = Object.assign(this, { meter });
        browser.audioContexts.push(context);
        const original = this.createGain.bind(this);
        let first = true;
        this.createGain = () => {
          const gain = original();
          if (first) { gain.connect(meter); first = false; }
          return gain;
        };
      }
    };
  });
});

test('starts by gesture; renders actual Web Audio signal; pauses and resumes without time drift', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'Смотреть сцену', exact: true })).toBeEnabled();
  await expect(page.locator('#scrub')).toHaveValue('0');
  await expect(page.locator('#subtitle')).toBeHidden();
  expect(await page.evaluate(() => (window as unknown as AudioWindow).audioContexts.length)).toBe(0);
  await page.getByRole('button', { name: 'Смотреть сцену', exact: true }).click();
  await expect(page.locator('#caption')).toContainText('Турнир был завтра');
  await expect.poll(() => page.evaluate(() => {
    const context = (window as unknown as AudioWindow).audioContexts[0];
    const buffer = new Float32Array(2048);
    context.meter.getFloatTimeDomainData(buffer);
    return buffer.reduce((sum, value) => sum + value * value, 0) / buffer.length;
  })).toBeGreaterThan(0.000001);
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  const time = await page.locator('#scrub').inputValue();
  await expect.poll(() => page.evaluate(() => (window as unknown as AudioWindow).audioContexts[0].state)).toBe('suspended');
  await page.waitForTimeout(200);
  await expect(page.locator('#scrub')).toHaveValue(time);
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await expect.poll(async () => Number(await page.locator('#scrub').inputValue())).toBeGreaterThan(Number(time));
});

test('cue review, speed, mute, seek to ending, replay, and share link work', async ({ page }) => {
  await page.goto('./');
  await page.locator('[data-cue="shoes"]').click();
  await expect(page.locator('#caption')).toHaveText('— А приметы какие?');
  await expect(page.locator('#paused-mark')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as AudioWindow).audioContexts.length)).toBe(0);
  await page.getByLabel('Скорость').selectOption('2');
  await page.getByRole('button', { name: 'Выключить звук', exact: true }).click();
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as AudioWindow).audioContexts.length)).toBe(0);
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  await page.getByLabel('Позиция сцены').press('End');
  await expect(page.locator('#fight')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Следующий кадр' })).toBeDisabled();
  await page.getByRole('button', { name: 'Разобраться', exact: true }).click();
  await expect(page.locator('#fight-note')).toBeVisible();
  await page.locator('[data-cue="recognition"]').click();
  await page.getByRole('button', { name: 'Ссылка на этот момент' }).click();
  await expect(page).toHaveURL(/#scene=precinct&t=32\.3$/);
  await page.reload();
  await expect(page.locator('#scrub')).toHaveValue('32300');
  await page.getByRole('button', { name: 'Смотреть с этого момента', exact: true }).click();
  await expect(page.locator('#caption')).toHaveText('— Понятно. Он у меня.');
  await page.getByRole('button', { name: 'Сначала', exact: true }).click();
  await expect(page.locator('#caption')).toContainText('Турнир был завтра');
});

test('keyboard navigation and layout work without external runtime requests', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (request.url().startsWith('http') && !request.url().startsWith('http://127.0.0.1:4197/')) external.push(request.url());
  });
  await page.goto('./#scene=precinct&t=0');
  await page.locator('#stage').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#caption')).toContainText('Я решил начать с участкового');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#caption')).toContainText('Турнир был завтра');
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.viewport);
  expect(external).toEqual([]);
  expect(await page.locator('#art').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
});

test('image failure blocks playback with a visible explanation', async ({ page }) => {
  await page.route('**/art/precinct.webp', (route) => route.abort());
  await page.goto('./');
  await expect(page.locator('#status')).toContainText('Не удалось загрузить иллюстрацию');
  await expect(page.locator('#start')).toBeDisabled();
  await expect(page.locator('#play')).toBeDisabled();
});

test('muting active playback suspends audio; final frame stops and replay restarts', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Смотреть сцену', exact: true }).click();
  await page.getByRole('button', { name: 'Выключить звук', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as AudioWindow).audioContexts[0].state)).toBe('suspended');
  await expect(page.getByRole('button', { name: 'Пауза', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Включить звук', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as AudioWindow).audioContexts[0].state)).toBe('running');
  await page.locator('[data-cue="fight"]').click();
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await expect(page.locator('#scrub')).toHaveValue('51600', { timeout: 6000 });
  await expect(page.getByRole('button', { name: 'Воспроизвести', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as AudioWindow).audioContexts[0].state)).toBe('suspended');
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await expect(page.locator('#caption')).toContainText('Турнир был завтра');
  expect(await page.evaluate(() => (window as unknown as AudioWindow).audioContexts.length)).toBe(1);
});

test('audio failure falls back to subtitle playback', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { value: class { constructor() { throw new Error('Audio unavailable'); } } });
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'Смотреть сцену', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Просмотр продолжится без звука');
  await expect.poll(async () => Number(await page.locator('#scrub').inputValue())).toBeGreaterThan(0);
});
