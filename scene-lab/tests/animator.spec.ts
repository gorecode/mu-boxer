import { expect, test } from '@playwright/test';

test('animator starts paused on the memo, freezes speech on pause and completes at 2x', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T08:00:00Z') });
  await page.goto('./#scene=animator&t=0');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#title')).toHaveText('Улыбку убери');
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
  expect(partial!.length).toBeLessThan('Как я и предполагал, участковый знал, куда мне нужно.'.length);
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  const paused = await page.locator('#scrub').inputValue();
  await page.clock.runFor(500);
  await expect(page.locator('#scrub')).toHaveValue(paused);
  await expect(page.locator('#caption-typed')).toHaveText(partial!);
  await page.locator('#speed').selectOption('2');
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await page.clock.runFor(18000);
  await expect(page.locator('#scrub')).toHaveValue('34300');
  await expect(page.locator('#fight')).toBeVisible();
  await expect(page.locator('#opponent')).toHaveText('АНИМАТОРА');
  await expect(page.locator('#art')).toHaveAttribute('src', /animator-final-v1.webp$/);
  await expect(page.locator('#subtitle')).toBeHidden();
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await page.clock.runFor(100);
  await expect(page.locator('#fight')).toBeHidden();
  await expect(page.locator('#art')).toHaveAttribute('src', /animator-memo-v2.webp$/);
});

test('gesture, neutral thought and angry reveal stay in order with readable silent inserts', async ({ page }) => {
  await page.goto('./#scene=animator&t=0');
  await expect(page.locator('#start')).toBeEnabled();
  for (const [time, image, text] of [
    ['8300', 'leaflet', ''], ['12900', 'wide', ''],
    ['17050', 'gesture', ''], ['21449', 'gesture', 'Я ничего плохого ему не сказал.'],
    ['24849', 'wide', 'А он уже поднял на меня руку.'], ['24850', 'ready', ''],
    ['28699', 'ready', 'Я был вынужден защищаться.'], ['28700', 'brick', ''],
    ['30400', 'final', ''],
  ]) {
    await page.locator('#scrub').fill(time);
    await expect(page.locator('#art')).toHaveAttribute('src', new RegExp(`animator-${image}-v1.webp$`));
    await expect(page.locator('#caption-typed')).toHaveText(text);
    if (!text) await expect(page.locator('#subtitle')).toBeHidden();
    await expect(page.locator('#fight')).toBeHidden();
  }
  await page.locator('#scrub').fill('25500');
  const close = await page.locator('#art').getAttribute('style');
  await page.locator('#scrub').fill('26500');
  expect(await page.locator('#art').getAttribute('style')).not.toBe(close);
  await expect(page.locator('#caption-typed')).toContainText('Я был');
  await page.locator('#scrub').fill('27300');
  const wide = await page.locator('#art').getAttribute('style');
  await page.locator('#scrub').fill('28699');
  await expect(page.locator('#art')).toHaveAttribute('style', wide!);
  await page.locator('#scrub').fill('31800');
  await expect(page.locator('#fight')).toBeVisible();
});

test('a missing explanatory panel blocks start; another scene and repaired loading recover', async ({ page }) => {
  await page.route('**/art/animator-gesture-v1.webp', (route) => route.abort());
  await page.goto('./#scene=animator&t=0');
  await expect(page.locator('#status')).toContainText('Не удалось загрузить иллюстрацию');
  await expect(page.locator('#start')).toBeDisabled();
  await expect(page.locator('#play')).toBeDisabled();
  await page.getByLabel('СЦЕНА', { exact: true }).selectOption('precinct');
  await expect(page.locator('#start')).toBeEnabled();
  await page.unroute('**/art/animator-gesture-v1.webp');
  await page.getByLabel('СЦЕНА', { exact: true }).selectOption('animator');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#scrub')).toHaveValue('0');
  await expect(page.locator('#art')).toHaveAttribute('src', /animator-memo-v2.webp$/);
});

test('reduced motion, direct links and narrow captions preserve the new scene', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#scene=animator&t=25.5');
  await expect(page.locator('#start')).toBeEnabled();
  const close = await page.locator('#art').getAttribute('style');
  await page.locator('#scrub').fill('26500');
  await expect(page.locator('#art')).toHaveAttribute('style', close!);
  await page.locator('#scrub').fill('27300');
  expect(await page.locator('#art').getAttribute('style')).not.toBe(close);
  await page.locator('#scrub').fill('18000');
  await page.getByRole('button', { name: 'Ссылка на этот момент' }).click();
  await page.reload();
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#scene-select')).toHaveValue('animator');
  await expect(page.locator('#scrub')).toHaveValue('18000');
  await expect(page.locator('#art')).toHaveAttribute('src', /animator-gesture-v1.webp$/);
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 800 });
    await page.locator('#scrub').fill('24849');
    await expect(page.locator('#caption-typed')).toHaveText('А он уже поднял на меня руку.');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const stage = await page.locator('#stage').boundingBox(), subtitle = await page.locator('#subtitle').boundingBox();
    expect(subtitle!.x).toBeGreaterThanOrEqual(stage!.x);
    expect(subtitle!.x + subtitle!.width).toBeLessThanOrEqual(stage!.x + stage!.width);
  }
});
