import { expect, test } from '@playwright/test';

test('the narration starts after a held image, pauses and replays without autoplay', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { value: class { constructor() { throw new Error('No audio before gesture'); } } });
  });
  await page.clock.install({ time: new Date('2026-01-01T08:00:00Z') });
  await page.goto('./');
  await expect(page.locator('#scene-select')).toHaveValue('intro');
  await expect(page.locator('#story-intro')).toHaveText('Моё прошлое');
  await expect(page.locator('#story-duration')).toContainText('69.2 с');
  await expect(page.locator('#start')).toBeEnabled();
  await page.clock.pauseAt(new Date('2026-01-01T09:00:00Z'));
  await page.clock.runFor(500);
  await expect(page.locator('#scrub')).toHaveValue('0');
  await expect(page.locator('#subtitle')).toBeHidden();
  await expect(page.locator('#status')).not.toContainText('Звук недоступен');
  await page.getByRole('button', { name: 'Выключить звук', exact: true }).click();
  await page.locator('#start').click();
  const camera = await page.locator('#art').getAttribute('style');
  await page.clock.runFor(300);
  await expect(page.locator('#subtitle')).toBeHidden();
  await expect(page.locator('#caption-typed')).toHaveText('');
  await page.clock.runFor(700);
  const partial = await page.locator('#caption-typed').textContent();
  expect(partial!.length).toBeGreaterThan(0);
  expect(partial!.length).toBeLessThan('Когда-то убили моего лучшего друга.'.length);
  await expect(page.locator('#art')).toHaveAttribute('style', camera!);
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  const paused = await page.locator('#scrub').inputValue();
  await page.clock.runFor(1000);
  await expect(page.locator('#scrub')).toHaveValue(paused);
  await expect(page.locator('#caption-typed')).toHaveText(partial!);
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await page.clock.runFor(70000);
  await expect(page.locator('#scrub')).toHaveValue('69200');
  await expect(page.locator('#caption-typed')).toHaveText('Я снова стал заниматься боксом.');
  await expect(page.locator('#art')).toHaveAttribute('src', /intro-gym-v3.webp$/);
  await expect(page.locator('#title-card')).toBeHidden();
  await expect(page.locator('#fight')).toBeHidden();
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await page.clock.runFor(300);
  await expect(page.locator('#subtitle')).toBeHidden();
  expect(Number(await page.locator('#scrub').inputValue())).toBeLessThan(500);
});

test('gun framing moves continuously during the hesitation and pauses with the scene', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T08:00:00Z') });
  await page.goto('./#scene=intro&t=6.8');
  await expect(page.locator('#start')).toBeEnabled();
  await page.clock.pauseAt(new Date('2026-01-01T09:00:00Z'));
  await page.getByRole('button', { name: 'Выключить звук', exact: true }).click();
  await page.locator('#start').click();
  const from = await page.locator('#art').getAttribute('style');
  await page.clock.runFor(1000);
  await expect(page.locator('#caption-typed')).toHaveText('А пистолет…');
  expect(await page.locator('#art').getAttribute('style')).not.toBe(from);
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  const middle = await page.locator('#art').getAttribute('style');
  await page.clock.runFor(600);
  await expect(page.locator('#art')).toHaveAttribute('style', middle!);
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await page.clock.runFor(1500);
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  const settled = await page.locator('#art').getAttribute('style');
  expect(settled).not.toBe(middle);
  await page.locator('#scrub').fill('12000');
  await expect(page.locator('#art')).toHaveAttribute('style', settled!);
  await expect(page.locator('#caption-typed')).toHaveText('нашли у меня в кармане.');
});

test('camera settles on the puzzled face before speech; the judge line clears in silence', async ({ page }) => {
  await page.goto('./#scene=intro&t=0');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#scrub').fill('13300');
  await expect(page.locator('#subtitle')).toBeHidden();
  const gun = await page.locator('#art').getAttribute('style');
  await page.locator('#scrub').fill('14400');
  expect(await page.locator('#art').getAttribute('style')).not.toBe(gun);
  await expect(page.locator('#subtitle')).toBeHidden();
  await page.locator('#scrub').fill('15500');
  const face = await page.locator('#art').getAttribute('style');
  await expect(page.locator('#caption-typed')).toHaveText('');
  await expect(page.locator('#subtitle')).toBeHidden();
  await page.locator('#scrub').fill('16000');
  await expect(page.locator('#subtitle')).toBeVisible();
  await expect(page.locator('#art')).toHaveAttribute('style', face!);
  await expect(page.locator('#caption-typed')).toContainText('Ка');
  await page.locator('#scrub').fill('22399');
  await expect(page.locator('#caption-typed')).toHaveText('Суд не стал слушать.');
  await page.locator('#scrub').fill('22400');
  await expect(page.locator('#subtitle')).toBeHidden();
  await expect(page.locator('#caption-typed')).toHaveText('');
  await expect(page.locator('#art')).toHaveAttribute('src', /intro-court-v2.webp$/);
  await page.locator('#scrub').fill('23099');
  await expect(page.locator('#subtitle')).toBeHidden();
  await page.locator('#scrub').fill('26599');
  await expect(page.locator('#caption-typed')).toHaveText('И меня посадили в тюрьму.');
  await expect(page.locator('#art')).toHaveAttribute('src', /intro-cell-v3.webp$/);
  await page.locator('#scrub').fill('47099');
  await expect(page.locator('#caption-typed')).toHaveText('Я никому не хотел причинять зла.');
  await expect(page.locator('#art')).toHaveAttribute('src', /boxer-angry.webp$/);
  await page.locator('#scrub').fill('47999');
  await expect(page.locator('#art')).toHaveAttribute('src', /intro-woman-after-v3.webp$/);
  await expect(page.locator('#subtitle')).toBeHidden();
  await page.locator('#scrub').fill('50199');
  await expect(page.locator('#caption-typed')).toHaveText('Но был вынужден.');
});

test('linked silent moments restore framing and other scenes keep their normal subtitle start', async ({ page }) => {
  await page.goto('./#scene=intro&t=14.2');
  await expect(page.locator('#start')).toBeEnabled();
  const camera = await page.locator('#art').getAttribute('style');
  await page.getByRole('button', { name: 'Ссылка на этот момент' }).click();
  await page.reload();
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#art')).toHaveAttribute('style', camera!);
  await expect(page.locator('#subtitle')).toBeHidden();
  await page.getByLabel('СЦЕНА', { exact: true }).selectOption('precinct');
  await page.locator('[data-cue=thinking]').click();
  await expect(page.locator('#subtitle')).toBeVisible();
  await expect(page.locator('#speaker')).toHaveText('Боксёр');
  await page.getByLabel('СЦЕНА', { exact: true }).selectOption('intro');
  await expect(page.locator('#scrub')).toHaveValue('0');
  await expect(page.locator('#story-intro')).toHaveText('Моё прошлое');
  await page.locator('[data-cue=no-harm]').click();
  await expect(page.locator('#art')).toHaveAttribute('src', /boxer-angry.webp$/);
});

test('a missing later plan blocks playback and switching scenes recovers', async ({ page }) => {
  await page.route('**/art/intro-road-v3.webp', (route) => route.abort());
  await page.goto('./#scene=unknown&t=35');
  await expect(page.locator('#scene-select')).toHaveValue('intro');
  await expect(page.locator('#status')).toContainText('Не удалось загрузить иллюстрацию');
  await expect(page.locator('#start')).toBeDisabled();
  await expect(page.locator('#play')).toBeDisabled();
  await page.getByLabel('СЦЕНА', { exact: true }).selectOption('queue');
  await expect(page.locator('#start')).toBeEnabled();
});

test('reduced motion retains dramatic pauses and cuts without camera motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#scene=intro&t=6.8');
  await expect(page.locator('#start')).toBeEnabled();
  const initial = await page.locator('#art').getAttribute('style');
  await page.locator('#scrub').fill('7950');
  await expect(page.locator('#art')).toHaveAttribute('style', initial!);
  await page.locator('#scrub').fill('29700');
  await expect(page.locator('#art')).toHaveAttribute('src', /intro-road-v3.webp$/);
  await expect(page.locator('#subtitle')).toBeHidden();
  expect(await page.locator('#art').evaluate((img) => getComputedStyle(img).transitionDuration)).toBe('0s');
});

test('short thought-sized captions and controls fit narrow screens', async ({ page }) => {
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('./#scene=intro&t=60.3');
    await expect(page.locator('#start')).toBeEnabled();
    await page.locator('#scrub').fill('60300');
    await expect(page.locator('#caption-typed')).toContainText('подставил.');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const stage = await page.locator('#stage').boundingBox();
    const subtitle = await page.locator('#subtitle').boundingBox();
    expect(subtitle!.x).toBeGreaterThanOrEqual(stage!.x);
    expect(subtitle!.x + subtitle!.width).toBeLessThanOrEqual(stage!.x + stage!.width);
  }
});
