import { expect, test } from '@playwright/test';

test('animator starts paused on the memo, freezes speech on pause and completes at 2x', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T08:00:00Z') });
  await page.goto('./#scene=animator&t=0');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#title')).toHaveText('Тебе смешно?');
  await expect(page.locator('#art')).toHaveAttribute('src', /animator-memo-v2.webp$/);
  await page.clock.pauseAt(new Date('2026-01-01T09:00:00Z'));
  await page.clock.runFor(500);
  await expect(page.locator('#scrub')).toHaveValue('0');
  await page.getByRole('button', { name: 'Выключить звук', exact: true }).click();
  await page.locator('#start').click();
  await page.clock.runFor(200);
  await expect(page.locator('#subtitle')).toBeHidden();
  await page.clock.runFor(1000);
  const partial = await page.locator('#caption-typed').textContent();
  expect(partial!.length).toBeGreaterThan(0);
  expect(partial!.length).toBeLessThan('Я узнал, куда мне нужно.'.length);
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  const paused = await page.locator('#scrub').inputValue();
  await page.clock.runFor(500);
  await expect(page.locator('#scrub')).toHaveValue(paused);
  await expect(page.locator('#caption-typed')).toHaveText(partial!);
  await page.locator('#speed').selectOption('2');
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await page.clock.runFor(20000);
  await expect(page.locator('#scrub')).toHaveValue('38400');
  await expect(page.locator('#fight')).toBeVisible();
  await expect(page.locator('#opponent')).toHaveText('АНИМАТОРА');
  await expect(page.locator('#art')).toHaveAttribute('src', /animator-final-v2.webp$/);
  await expect(page.locator('#subtitle')).toBeHidden();
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await page.clock.runFor(100);
  await expect(page.locator('#fight')).toBeHidden();
  await expect(page.locator('#art')).toHaveAttribute('src', /animator-memo-v2.webp$/);
});

test('exit, introduction, reading pause and matching wide thought panels follow the revised staging', async ({ page }) => {
  await page.goto('./#scene=animator&t=0');
  await expect(page.locator('#start')).toBeEnabled();
  for (const [time, image, text] of [
    ['6500', 'exit-v2', 'Я направился в МФЦ.'], ['6600', 'solo-v1', ''],
    ['12399', 'wide-v2', 'Где здесь МФЦ?'], ['12400', 'leaflet-v1', ''],
    ['13199', 'leaflet-v1', ''], ['16599', 'leaflet-v1', 'Приведи друга — получи подарок.'],
    ['19199', 'wide-v2', 'Моего друга убили.'], ['19200', 'wide-v2', ''], ['20999', 'wide-v2', ''],
    ['22899', 'wide-v2', 'Тебе смешно?'], ['22900', 'gesture-v2', ''],
    ['27299', 'gesture-v2', 'Я ничего плохого ему не сказал.'],
    ['30699', 'gesture-v2', 'А он уже поднял на меня руку.'], ['30700', 'ready-v2', ''],
    ['34499', 'ready-v2', 'Он вынудил меня защищаться.'], ['34500', 'final-v2', ''],
  ]) {
    await page.locator('#scrub').fill(time);
    await expect(page.locator('#art')).toHaveAttribute('src', new RegExp(`animator-${image}.webp$`));
    await expect(page.locator('#caption-typed')).toHaveText(text);
    if (!text) await expect(page.locator('#subtitle')).toBeHidden();
    await expect(page.locator('#fight')).toBeHidden();
  }
  await page.locator('#scrub').fill('8599');
  await expect(page.locator('#art')).toHaveAttribute('src', /animator-solo-v1.webp$/);
  const narration = await page.locator('#caption-typed').textContent();
  await page.locator('#scrub').fill('8600');
  await expect(page.locator('#art')).toHaveAttribute('src', /animator-wide-v2.webp$/);
  await expect(page.locator('#caption-typed')).toHaveText(narration!);
  await page.locator('#scrub').fill('23800');
  const wide = await page.locator('#art').getAttribute('style');
  for (const time of ['27300', '30700', '31200', '34499']) {
    await page.locator('#scrub').fill(time);
    await expect(page.locator('#art')).toHaveAttribute('style', wide!);
  }
  await expect(page.locator('[data-cue=brick]')).toHaveCount(0);
  await page.locator('#scrub').fill('35900');
  await expect(page.locator('#fight')).toBeVisible();
});

test('a missing revised explanatory panel blocks start and repaired loading recovers', async ({ page }) => {
  await page.route('**/art/animator-gesture-v2.webp', (route) => route.abort());
  await page.goto('./#scene=animator&t=0');
  await expect(page.locator('#status')).toContainText('Не удалось загрузить иллюстрацию');
  await expect(page.locator('#start')).toBeDisabled();
  await expect(page.locator('#play')).toBeDisabled();
  await page.getByLabel('СЦЕНА', { exact: true }).selectOption('precinct');
  await expect(page.locator('#start')).toBeEnabled();
  await page.unroute('**/art/animator-gesture-v2.webp');
  await page.getByLabel('СЦЕНА', { exact: true }).selectOption('animator');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#scrub')).toHaveValue('0');
  await expect(page.locator('#art')).toHaveAttribute('src', /animator-memo-v2.webp$/);
});

test('wide expression cut, direct links and narrow captions work with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#scene=animator&t=24');
  await expect(page.locator('#start')).toBeEnabled();
  const wide = await page.locator('#art').getAttribute('style');
  await page.getByRole('button', { name: 'Ссылка на этот момент' }).click();
  await page.reload();
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#scene-select')).toHaveValue('animator');
  await expect(page.locator('#scrub')).toHaveValue('24000');
  await expect(page.locator('#art')).toHaveAttribute('src', /animator-gesture-v2.webp$/);
  await page.locator('#scrub').fill('30700');
  await expect(page.locator('#art')).toHaveAttribute('src', /animator-ready-v2.webp$/);
  await expect(page.locator('#art')).toHaveAttribute('style', wide!);
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 800 });
    await page.locator('#scrub').fill('34499');
    await expect(page.locator('#caption-typed')).toHaveText('Он вынудил меня защищаться.');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const stage = await page.locator('#stage').boundingBox(), subtitle = await page.locator('#subtitle').boundingBox();
    expect(subtitle!.x).toBeGreaterThanOrEqual(stage!.x);
    expect(subtitle!.x + subtitle!.width).toBeLessThanOrEqual(stage!.x + stage!.width);
  }
});
