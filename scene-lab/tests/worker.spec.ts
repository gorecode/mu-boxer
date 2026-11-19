import { expect, test } from '@playwright/test';

test('worker starts only by gesture, pauses, ends with the right opponent and replays', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T08:00:00Z') });
  await page.goto('./#scene=worker&t=0');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#scene-select')).toHaveValue('worker');
  await expect(page.locator('#title')).toHaveText('А вот же лента');
  await expect(page.locator('#story-duration')).toContainText('23.8 с');
  await page.clock.pauseAt(new Date('2026-01-01T09:00:00Z'));
  await page.clock.runFor(1000);
  await expect(page.locator('#scrub')).toHaveValue('0');
  await page.getByRole('button', { name: 'Выключить звук', exact: true }).click();
  await page.locator('#start').click();
  await page.clock.runFor(100);
  await expect(page.locator('#subtitle')).toBeHidden();
  await page.clock.runFor(1000);
  const partial = await page.locator('#caption-typed').textContent();
  expect(partial!.length).toBeGreaterThan(0);
  expect(partial!.length).toBeLessThan('Но путь мне перегородил рабочий.'.length);
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  const paused = await page.locator('#scrub').inputValue();
  await page.clock.runFor(500);
  await expect(page.locator('#scrub')).toHaveValue(paused);
  await expect(page.locator('#caption-typed')).toHaveText(partial!);
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await page.clock.runFor(24000);
  await expect(page.locator('#scrub')).toHaveValue('23800');
  await expect(page.locator('#fight')).toBeVisible();
  await expect(page.locator('#opponent')).toHaveText('РАБОЧЕГО');
  await expect(page.locator('#art')).toHaveAttribute('src', /worker-ready-v2.webp$/);
  await expect(page.locator('#subtitle')).toBeHidden();
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await page.clock.runFor(100);
  await expect(page.locator('#fight')).toBeHidden();
  await expect(page.locator('#art')).toHaveAttribute('src', /worker-wide-v2.webp$/);
});

test('gestures and the stance cut preserve the growing forced-fight caption', async ({ page }) => {
  await page.goto('./#scene=worker&t=0');
  await expect(page.locator('#start')).toBeEnabled();
  for (const [time, text, image] of [
    ['5900', 'Мне к участковому.', 'worker-wide-v2'],
    ['7400', 'Обходи.', 'worker-wide-v2'],
    ['9300', 'Так вот же дверь.', 'worker-boxer-point-v2'],
    ['11600', 'А вот же лента.', 'worker-tape-v2'],
  ]) {
    await page.locator('#scrub').fill(time);
    await expect(page.locator('#caption-typed')).toHaveText(text);
    await expect(page.locator('#art')).toHaveAttribute('src', new RegExp(`${image}.webp$`));
  }
  await page.locator('#scrub').fill('15499');
  await expect(page.locator('#art')).toHaveAttribute('src', /worker-wide-v2.webp$/);
  await page.locator('#scrub').fill('15500');
  await expect(page.locator('#art')).toHaveAttribute('src', /boxer-angry.webp$/);
  await page.locator('#scrub').fill('18899');
  await expect(page.locator('#art')).toHaveAttribute('src', /boxer-angry.webp$/);
  await expect(page.locator('#caption-typed')).toHaveText('Я БЫЛ ВЫНУЖДЕН…');
  await page.locator('#scrub').fill('18900');
  await expect(page.locator('#art')).toHaveAttribute('src', /worker-ready-v2.webp$/);
  await expect(page.locator('#caption-typed')).toHaveText('Я БЫЛ ВЫНУЖДЕН…');
  await expect(page.locator('[data-cue=forced]')).toHaveAttribute('aria-current', 'step');
  await page.locator('#scrub').fill('20200');
  await expect(page.locator('#caption-typed')).toHaveText('Я БЫЛ ВЫНУЖДЕН… начать драку.');
  await expect(page.locator('#fight')).toBeHidden();
  await page.locator('#scrub').fill('21299');
  await expect(page.locator('#caption-typed')).toHaveText('Я БЫЛ ВЫНУЖДЕН… начать драку.');
  await page.locator('#scrub').fill('21300');
  await expect(page.locator('#fight')).toBeVisible();
});

test('missing final worker art blocks playback and switching scenes recovers', async ({ page }) => {
  await page.route('**/art/worker-ready-v2.webp', (route) => route.abort());
  await page.goto('./#scene=worker&t=0');
  await expect(page.locator('#status')).toContainText('Не удалось загрузить иллюстрацию');
  await expect(page.locator('#start')).toBeDisabled();
  await expect(page.locator('#play')).toBeDisabled();
  await page.getByLabel('СЦЕНА', { exact: true }).selectOption('prologue');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#story-intro')).toHaveText('Мне нужна справка');
});

test('worker links, reduced motion and narrow captions survive seeking and reload', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#scene=worker&t=12.2');
  await expect(page.locator('#start')).toBeEnabled();
  const door = await page.locator('#art').getAttribute('style');
  await page.locator('#scrub').fill('13000');
  await expect(page.locator('#art')).toHaveAttribute('style', door!);
  await page.locator('#scrub').fill('14300');
  expect(await page.locator('#art').getAttribute('style')).not.toBe(door);
  await page.locator('#scrub').fill('19200');
  const text = await page.locator('#caption-typed').textContent();
  await page.getByRole('button', { name: 'Ссылка на этот момент' }).click();
  await page.reload();
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#scene-select')).toHaveValue('worker');
  await expect(page.locator('#scrub')).toHaveValue('19200');
  await expect(page.locator('#caption-typed')).toHaveText(text!);
  await expect(page.locator('#art')).toHaveAttribute('src', /worker-ready-v2.webp$/);
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 800 });
    await page.locator('#scrub').fill('17299');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const stage = await page.locator('#stage').boundingBox(), subtitle = await page.locator('#subtitle').boundingBox();
    expect(subtitle!.x).toBeGreaterThanOrEqual(stage!.x);
    expect(subtitle!.x + subtitle!.width).toBeLessThanOrEqual(stage!.x + stage!.width);
  }
});

test('the officer scene opens on the post-fight crossing before the existing office dialogue', async ({ page }) => {
  await page.goto('./#scene=precinct&t=0');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#story-duration')).toContainText('30 с');
  await expect(page.locator('#art')).toHaveAttribute('src', /worker-aftermath-v2.webp$/);
  await page.locator('#scrub').fill('5000');
  await expect(page.locator('#caption-typed')).toHaveText('Рабочий больше не возражал. Я прошёл к участковому.');
  const settled = await page.locator('#art').getAttribute('style');
  await page.locator('#scrub').fill('5999');
  await expect(page.locator('#art')).toHaveAttribute('style', settled!);
  await page.locator('#scrub').fill('6000');
  await expect(page.locator('#art')).toHaveAttribute('src', /precinct-idle.webp$/);
  await expect(page.locator('#caption-typed')).toHaveText('');
  await expect(page.locator('[data-cue=request]')).toHaveAttribute('aria-current', 'step');
  await page.route('**/art/worker-aftermath-v2.webp', (route) => route.abort());
  await page.reload();
  await expect(page.locator('#status')).toContainText('Не удалось загрузить иллюстрацию');
  await expect(page.locator('#start')).toBeDisabled();
});
