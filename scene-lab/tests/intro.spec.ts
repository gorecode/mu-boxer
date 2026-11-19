import { expect, test } from '@playwright/test';

test('the illustrated narration waits for a gesture, moves with time, pauses and replays', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { value: class { constructor() { throw new Error('No audio before gesture'); } } });
  });
  await page.clock.install({ time: new Date('2026-01-01T08:00:00Z') });
  await page.goto('./');
  await expect(page.locator('#scene-select')).toHaveValue('intro');
  await expect(page.locator('#story-intro')).toHaveText('Моё прошлое');
  await expect(page.locator('#story-duration')).toContainText('41.1 с');
  await expect(page.locator('#start')).toBeEnabled();
  await page.clock.pauseAt(new Date('2026-01-01T09:00:00Z'));
  await page.clock.runFor(500);
  await expect(page.locator('#scrub')).toHaveValue('0');
  await expect(page.locator('#subtitle')).toBeHidden();
  await expect(page.locator('#status')).not.toContainText('Звук недоступен');
  await page.getByRole('button', { name: 'Выключить звук', exact: true }).click();
  await page.locator('#start').click();
  const camera = await page.locator('#art').getAttribute('style');
  await page.clock.runFor(700);
  await expect(page.locator('#speaker')).toHaveText('Боксёр · рассказ');
  const partial = await page.locator('#caption-typed').textContent();
  expect(partial!.length).toBeGreaterThan(0);
  expect(partial!.length).toBeLessThan('Когда-то убили моего лучшего друга.'.length);
  expect(await page.locator('#art').getAttribute('style')).not.toBe(camera);
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  const paused = await page.locator('#scrub').inputValue();
  const pausedCamera = await page.locator('#art').getAttribute('style');
  await page.clock.runFor(1000);
  await expect(page.locator('#scrub')).toHaveValue(paused);
  await expect(page.locator('#art')).toHaveAttribute('style', pausedCamera!);
  await expect(page.locator('#caption-typed')).toHaveText(partial!);
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await page.clock.runFor(42000);
  await expect(page.locator('#scrub')).toHaveValue('41100');
  await expect(page.locator('#art')).toHaveAttribute('src', /intro-gym-v3.webp$/);
  await expect(page.locator('#caption-typed')).toHaveText('Меня оправдали. Я снова стал заниматься боксом.');
  await expect(page.locator('#title-card')).toBeHidden();
  await expect(page.locator('#fight')).toBeHidden();
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await page.clock.runFor(700);
  expect(Number(await page.locator('#scrub').inputValue())).toBeLessThan(1000);
  await expect(page.locator('#speaker')).toHaveText('Боксёр · рассказ');
});

test('seeking changes plans on the approved words while retaining the same ongoing caption', async ({ page }) => {
  await page.goto('./#scene=intro&t=0');
  await expect(page.locator('#start')).toBeEnabled();
  const moments = [
    [3600, 'intro-arrest'], [6835, 'intro-arrest'], [9800, 'intro-court-v2'],
    [11340, 'intro-cell-v3'], [14200, 'intro-escape-v3'], [15475, 'intro-road-v3'],
    [19300, 'intro-driver-v3'], [20905, 'intro-biker-v3'], [21995, 'intro-woman-v3'],
    [24600, 'boxer-angry'], [28200, 'intro-woman-after-v3'], [30100, 'intro-controller-v3'],
    [32895, 'intro-billiards-v3'], [36200, 'intro-acquittal-v3'], [37750, 'intro-gym-v3'],
  ] as const;
  for (const [time, image] of moments) {
    await page.locator('#scrub').fill(String(time));
    await expect(page.locator('#art')).toHaveAttribute('src', new RegExp(`${image}.webp$`));
    await expect(page.locator('#speaker')).toHaveText('Боксёр · рассказ');
    await expect(page.locator('#title-card')).toBeHidden();
    await expect(page.locator('#scene-setting')).toBeHidden();
    expect(await page.locator('#art').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  }
  await page.locator('#scrub').fill('3965');
  const gun = await page.locator('#art').evaluate((img) => img.style.transformOrigin);
  await page.locator('#scrub').fill('6835');
  expect(await page.locator('#art').evaluate((img) => img.style.transformOrigin)).not.toBe(gun);
  await expect(page.locator('#caption-typed')).toContainText('нашли у меня в кармане.');
  await expect(page.locator('[data-cue=pistol]')).toHaveAttribute('aria-current', 'step');
  await page.locator('#scrub').fill('28199');
  await expect(page.locator('#caption-typed')).toHaveText('Я никому не хотел причинять зла.');
  await expect(page.locator('#art')).toHaveAttribute('src', /boxer-angry.webp$/);
  await page.locator('#scrub').fill('28200');
  await expect(page.locator('#art')).toHaveAttribute('src', /intro-woman-after-v3.webp$/);
  await expect(page.locator('#caption-typed')).toHaveText('');
});

test('linked moments restore camera position and switching scenes clears the narration', async ({ page }) => {
  await page.goto('./#scene=intro&t=32');
  await expect(page.locator('#scrub')).toHaveValue('32000');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#subtitle')).toBeHidden();
  const camera = await page.locator('#art').getAttribute('style');
  await page.getByRole('button', { name: 'Ссылка на этот момент' }).click();
  await page.reload();
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#art')).toHaveAttribute('style', camera!);
  await page.getByLabel('СЦЕНА', { exact: true }).selectOption('precinct');
  await page.locator('[data-cue=fight]').click();
  await expect(page.locator('#fight')).toBeVisible();
  await page.getByLabel('СЦЕНА', { exact: true }).selectOption('intro');
  await expect(page.locator('#scrub')).toHaveValue('0');
  await expect(page.locator('#fight')).toBeHidden();
  await expect(page.locator('#story-intro')).toHaveText('Моё прошлое');
  await page.locator('[data-cue=no-harm]').click();
  await expect(page.locator('#speaker')).toHaveText('Боксёр · рассказ');
  await expect(page.locator('#art')).toHaveAttribute('src', /boxer-angry.webp$/);
});

test('an image used only by a later internal plan blocks playback when missing and switching recovers', async ({ page }) => {
  await page.route('**/art/intro-road-v3.webp', (route) => route.abort());
  await page.goto('./#scene=unknown&t=35');
  await expect(page.locator('#scene-select')).toHaveValue('intro');
  await expect(page.locator('#status')).toContainText('Не удалось загрузить иллюстрацию');
  await expect(page.locator('#start')).toBeDisabled();
  await expect(page.locator('#play')).toBeDisabled();
  await page.getByLabel('СЦЕНА', { exact: true }).selectOption('queue');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#status')).not.toContainText('Не удалось загрузить иллюстрацию');
});

test('reduced motion freezes movement but retains word-driven illustration cuts', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#scene=intro&t=0');
  await expect(page.locator('#start')).toBeEnabled();
  const initial = await page.locator('#art').getAttribute('style');
  await page.locator('#scrub').fill('1800');
  await expect(page.locator('#art')).toHaveAttribute('style', initial!);
  await page.locator('#scrub').fill('15475');
  await expect(page.locator('#art')).toHaveAttribute('src', /intro-road-v3.webp$/);
  expect(await page.locator('#art').evaluate((img) => getComputedStyle(img).transitionDuration)).toBe('0s');
});

test('narration and controls fit narrow screens', async ({ page }) => {
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('./#scene=intro&t=35.9');
    await expect(page.locator('#start')).toBeEnabled();
    await page.locator('#scrub').fill('35900');
    await expect(page.locator('#caption-typed')).toContainText('подставил.');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const stage = await page.locator('#stage').boundingBox();
    const subtitle = await page.locator('#subtitle').boundingBox();
    expect(subtitle!.x).toBeGreaterThanOrEqual(stage!.x);
    expect(subtitle!.x + subtitle!.width).toBeLessThanOrEqual(stage!.x + stage!.width);
  }
});
