import { expect, test } from '@playwright/test';

test('worker starts by gesture, pauses, ends with the right opponent and replays', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T08:00:00Z') });
  await page.goto('./#scene=worker&t=0');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#scene-select')).toHaveValue('worker');
  await expect(page.locator('#title')).toHaveText('А вот же лента');
  await expect(page.locator('#story-duration')).toContainText('23.12 с');
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
  await expect(page.locator('#scrub')).toHaveValue('23120');
  await expect(page.locator('#fight')).toBeVisible();
  await expect(page.locator('#opponent')).toHaveText('РАБОЧЕГО');
  await expect(page.locator('#art')).toHaveAttribute('src', /worker-ready-v2.webp$/);
  await expect(page.locator('#subtitle')).toBeHidden();
  await expect(page.locator('#scene-flash')).toBeHidden();
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await page.clock.runFor(100);
  await expect(page.locator('#fight')).toBeHidden();
  await expect(page.locator('#art')).toHaveAttribute('src', /worker-wide-v2.webp$/);
});

test('dialogue keeps the full head and the realization pulls back from the same face', async ({ page }) => {
  await page.goto('./#scene=worker&t=0');
  await expect(page.locator('#start')).toBeEnabled();
  for (const [time, text, image] of [
    ['5900', 'Мне к участковому.', 'worker-wide-v2'],
    ['7400', 'Обходи.', 'worker-wide-v2'],
    ['9300', 'Так вот же дверь.', 'worker-boxer-point-v2'],
    ['11600', 'А вот же лента.', 'worker-tape-v2'],
    ['15399', 'У меня не было времени обходить.', 'worker-wide-v2'],
    ['17299', 'И я понял…', 'worker-wide-v2'],
  ]) {
    await page.locator('#scrub').fill(time);
    await expect(page.locator('#caption-typed')).toHaveText(text);
    await expect(page.locator('#art')).toHaveAttribute('src', new RegExp(`${image}.webp$`));
    if (time === '5900' || time === '9300') {
      const head = await page.locator('#art').evaluate((image) => {
        const img = image.getBoundingClientRect(), stage = image.parentElement!.getBoundingClientRect();
        return { top: img.top + img.height * .04 - stage.top, bottom: img.top + img.height * .24 - stage.top, height: stage.height };
      });
      expect(head.top).toBeGreaterThan(head.height * .02);
      expect(head.bottom).toBeLessThan(head.height * .98);
    }
  }
  await page.locator('#scrub').fill('17420');
  await expect(page.locator('#art')).toHaveAttribute('src', /worker-ready-v2.webp$/);
  const close = await page.locator('#art').getAttribute('style');
  await page.locator('#scrub').fill('18320');
  const middle = await page.locator('#art').getAttribute('style');
  expect(middle).not.toBe(close);
  await expect(page.locator('#caption-typed')).toContainText('ДРАКА');
  await expect(page.locator('#art')).toHaveAttribute('src', /worker-ready-v2.webp$/);
  await page.locator('#scrub').fill('19300');
  await expect(page.locator('#caption-typed')).toHaveText('ДРАКА НЕИЗБЕЖНА!');
  const full = await page.locator('#art').getAttribute('style');
  expect(full).not.toBe(middle);
  await page.locator('#scrub').fill('20619');
  await expect(page.locator('#art')).toHaveAttribute('style', full!);
  await expect(page.locator('#fight')).toBeHidden();
  await page.locator('#scrub').fill('20620');
  await expect(page.locator('#fight')).toBeVisible();
});

test('the short flash only appears while playing its cue and clears on pause, seek and scene switch', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T08:00:00Z') });
  await page.goto('./#scene=worker&t=17.3');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#scene-flash')).toBeHidden();
  await page.clock.pauseAt(new Date('2026-01-01T09:00:00Z'));
  await page.getByRole('button', { name: 'Выключить звук', exact: true }).click();
  await page.locator('#start').click();
  await page.clock.runFor(50);
  await expect(page.locator('#scene-flash')).toBeVisible();
  expect(await page.locator('#scene-flash').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 240, 223)');
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  await expect(page.locator('#scene-flash')).toBeHidden();
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await page.clock.runFor(30);
  await expect(page.locator('#scene-flash')).toBeVisible();
  await page.clock.runFor(100);
  await expect(page.locator('#scene-flash')).toBeHidden();
  await page.locator('#scrub').fill('17300');
  await expect(page.locator('#scene-flash')).toBeHidden();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await page.clock.runFor(50);
  await expect(page.locator('#scene-flash')).toBeHidden();
  await page.getByLabel('СЦЕНА', { exact: true }).selectOption('precinct');
  await expect(page.locator('#scene-flash')).toBeHidden();
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

test('reduced motion cuts from the same face to the full panel; links and narrow captions survive reload', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#scene=worker&t=17.62');
  await expect(page.locator('#start')).toBeEnabled();
  const close = await page.locator('#art').getAttribute('style');
  await page.locator('#scrub').fill('18320');
  await expect(page.locator('#art')).toHaveAttribute('style', close!);
  await page.locator('#scrub').fill('19020');
  expect(await page.locator('#art').getAttribute('style')).not.toBe(close);
  await page.locator('#scrub').fill('18300');
  const text = await page.locator('#caption-typed').textContent();
  await page.getByRole('button', { name: 'Ссылка на этот момент' }).click();
  await page.reload();
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#scene-select')).toHaveValue('worker');
  await expect(page.locator('#scrub')).toHaveValue('18300');
  await expect(page.locator('#caption-typed')).toHaveText(text!);
  await expect(page.locator('#art')).toHaveAttribute('src', /worker-ready-v2.webp$/);
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 800 });
    await page.locator('#scrub').fill('15399');
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
