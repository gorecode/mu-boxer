import { expect, test } from '@playwright/test';

test('the introduction opens by default, types its narration, pauses, finishes and replays', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { value: class { constructor() { throw new Error('No audio before gesture'); } } });
  });
  await page.clock.install({ time: new Date('2026-01-01T08:00:00Z') });
  await page.goto('./');
  await expect(page.locator('#scene-select')).toHaveValue('intro');
  await expect(page.locator('#story-location')).toHaveText('Месть боксёра. Ранее.');
  await expect(page.locator('#story-duration')).toContainText('42.6 с');
  await expect(page.locator('#start')).toBeEnabled();
  await page.clock.pauseAt(new Date('2026-01-01T09:00:00Z'));
  await page.clock.runFor(500);
  await expect(page.locator('#scrub')).toHaveValue('0');
  await expect(page.locator('#subtitle')).toBeHidden();
  await expect(page.locator('#title-card')).toBeHidden();
  await expect(page.locator('#status')).not.toContainText('Звук недоступен');
  await page.getByRole('button', { name: 'Выключить звук', exact: true }).click();
  await page.locator('#start').click();
  await page.clock.runFor(400);
  const partial = await page.locator('#caption-typed').textContent();
  expect(partial!.length).toBeGreaterThan(0);
  expect(partial!.length).toBeLessThan('У меня убили лучшего друга.'.length);
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  const paused = await page.locator('#scrub').inputValue();
  await page.clock.runFor(1000);
  await expect(page.locator('#scrub')).toHaveValue(paused);
  await expect(page.locator('#caption-typed')).toHaveText(partial!);
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await page.clock.runFor(43000);
  await expect(page.locator('#scrub')).toHaveValue('42600');
  await expect(page.locator('#title-card')).toBeVisible();
  await expect(page.locator('#title-card-title')).toHaveText('МЕСТЬ БОКСЁРА II');
  await expect(page.locator('#fight')).toBeHidden();
  await expect(page.locator('#paused-mark')).toBeHidden();
  await expect(page.locator('#subtitle')).toBeHidden();
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await page.clock.runFor(400);
  await expect(page.locator('#title-card')).toBeHidden();
  await expect(page.locator('#art')).toHaveAttribute('src', /intro-arrest.webp$/);
  expect(Number(await page.locator('#scrub').inputValue())).toBeLessThan(1000);
  await expect(page.locator('#status')).not.toContainText('Звук недоступен');
});

test('review exposes every new illustration and keeps the excuse and final contradiction readable', async ({ page }) => {
  await page.goto('./#scene=intro&t=0');
  await expect(page.locator('#start')).toBeEnabled();
  const moments = [
    [3199, 'intro-arrest', 'У меня убили лучшего друга.'],
    [14799, 'intro-prison', 'Пришлось выбираться самому.'],
    [21499, 'intro-controller', 'Я был вынужден разобраться.'],
    [24999, 'intro-billiards', 'Убийцу я нашёл в бильярдной.'],
    [31699, 'intro-gym', 'Я снова занялся боксом.'],
    [37799, 'intro-registration', 'Об отсутствии судимости.'],
  ] as const;
  for (const [time, image, text] of moments) {
    await page.locator('#scrub').fill(String(time));
    await expect(page.locator('#art')).toHaveAttribute('src', new RegExp(`${image}.webp$`));
    await expect(page.locator('#caption-typed')).toHaveText(text);
    await expect(page.locator('#subtitle')).toBeVisible();
    expect(await page.locator('#art').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  }
  await page.locator('#scrub').fill('37800');
  await expect(page.locator('#subtitle')).toBeHidden();
  await expect(page.locator('#art')).toHaveAttribute('src', /boxer-thinking.webp$/);
  await page.locator('#scrub').fill('40599');
  await expect(page.locator('#caption-typed')).toHaveText('Турнир был завтра.');
  await expect(page.locator('#title-card')).toBeHidden();
  await page.locator('#scrub').fill('40600');
  await expect(page.locator('#title-card')).toBeVisible();
  await expect(page.locator('#title-card-eyebrow')).toHaveText('Турнир завтра.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('a linked title stays behind the start screen and clears when reviewing another scene', async ({ page }) => {
  await page.goto('./#scene=intro&t=40.6');
  await expect(page.locator('#scrub')).toHaveValue('40600');
  await expect(page.locator('#title-card')).toBeHidden();
  await expect(page.locator('#start')).toBeEnabled();
  await page.getByRole('button', { name: 'Выключить звук', exact: true }).click();
  await page.locator('#start').click();
  await expect(page.locator('#title-card')).toBeVisible();
  await page.getByRole('button', { name: 'Предыдущий кадр', exact: true }).click();
  await expect(page.locator('#title-card')).toBeHidden();
  await expect(page.locator('#scrub')).toHaveValue('38600');
  await page.getByRole('button', { name: 'Ссылка на этот момент' }).click();
  await expect(page).toHaveURL(/#scene=intro&t=38.6$/);
  await page.reload();
  await expect(page.locator('#scrub')).toHaveValue('38600');
  await page.getByLabel('СЦЕНА', { exact: true }).selectOption('precinct');
  await expect(page.locator('#story-intro')).toHaveText('Мне только\nсправку получить.');
  await page.locator('[data-cue=fight]').click();
  await expect(page.locator('#fight')).toBeVisible();
  await expect(page.locator('#title-card')).toBeHidden();
  await page.getByLabel('СЦЕНА', { exact: true }).selectOption('intro');
  await expect(page.locator('#scrub')).toHaveValue('0');
  await expect(page.locator('#title-card')).toBeHidden();
  await expect(page.locator('#fight')).toBeHidden();
  await expect(page.locator('#story-intro')).toBeVisible();
});

test('a missing later intro illustration blocks playback and switching scenes recovers', async ({ page }) => {
  await page.route('**/art/intro-registration.webp', (route) => route.abort());
  await page.goto('./#scene=unknown&t=35');
  await expect(page.locator('#scene-select')).toHaveValue('intro');
  await expect(page.locator('#scrub')).toHaveValue('0');
  await expect(page.locator('#status')).toContainText('Не удалось загрузить иллюстрацию');
  await expect(page.locator('#start')).toBeDisabled();
  await expect(page.locator('#play')).toBeDisabled();
  await page.getByLabel('СЦЕНА', { exact: true }).selectOption('queue');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#status')).not.toContainText('Не удалось загрузить иллюстрацию');
  await expect(page.locator('#art')).toHaveAttribute('src', /queue-ticket.webp$/);
});
