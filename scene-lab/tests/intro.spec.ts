import { expect, test } from '@playwright/test';

test('the serial recap opens by gesture, types dialogue, pauses, finishes and replays its opening', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { value: class { constructor() { throw new Error('No audio before gesture'); } } });
  });
  await page.clock.install({ time: new Date('2026-01-01T08:00:00Z') });
  await page.goto('./');
  await expect(page.locator('#scene-select')).toHaveValue('intro');
  await expect(page.locator('#story-intro')).toHaveText('Ранее в\n«Мести боксёра»');
  await expect(page.locator('#story-duration')).toContainText('41.1 с');
  await expect(page.locator('#start')).toBeEnabled();
  await page.clock.pauseAt(new Date('2026-01-01T09:00:00Z'));
  await page.clock.runFor(500);
  await expect(page.locator('#scrub')).toHaveValue('0');
  await expect(page.locator('#subtitle')).toBeHidden();
  await expect(page.locator('#title-card')).toBeHidden();
  await expect(page.locator('#scene-setting')).toBeHidden();
  await expect(page.locator('#status')).not.toContainText('Звук недоступен');
  await page.getByRole('button', { name: 'Выключить звук', exact: true }).click();
  await page.locator('#start').click();
  await expect(page.locator('#title-card-title')).toHaveText('РАНЕЕ В «МЕСТИ БОКСЁРА»');
  await expect(page.locator('#title-card')).toBeVisible();
  await page.clock.runFor(2200);
  await expect(page.locator('#title-card')).toBeHidden();
  await expect(page.locator('#scene-setting')).toBeVisible();
  const partial = await page.locator('#caption-typed').textContent();
  expect(partial!.length).toBeGreaterThan(0);
  expect(partial!.length).toBeLessThan('Твоего друга убили из этого пистолета.'.length);
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  const paused = await page.locator('#scrub').inputValue();
  await page.clock.runFor(1000);
  await expect(page.locator('#scrub')).toHaveValue(paused);
  await expect(page.locator('#caption-typed')).toHaveText(partial!);
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await page.clock.runFor(42000);
  await expect(page.locator('#scrub')).toHaveValue('41100');
  await expect(page.locator('#title-card')).toBeVisible();
  await expect(page.locator('#title-card-title')).toHaveText('МЕСТЬ БОКСЁРА II');
  await expect(page.locator('#scene-setting')).toBeHidden();
  await expect(page.locator('#fight')).toBeHidden();
  await expect(page.locator('#paused-mark')).toBeHidden();
  await expect(page.locator('#subtitle')).toBeHidden();
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await page.clock.runFor(200);
  await expect(page.locator('#title-card-title')).toHaveText('РАНЕЕ В «МЕСТИ БОКСЁРА»');
  expect(Number(await page.locator('#scrub').inputValue())).toBeLessThan(1000);
  await page.clock.runFor(2000);
  await expect(page.locator('#title-card')).toBeHidden();
  await expect(page.locator('#speaker')).toHaveText('Милиционер');
  await expect(page.locator('#status')).not.toContainText('Звук недоступен');
});

test('review shows the accusation, goal, aftermath and verdict in their actual locations', async ({ page }) => {
  await page.goto('./#scene=intro&t=0');
  await expect(page.locator('#start')).toBeEnabled();
  const moments = [
    [6399, 'intro-arrest', 'МЕСТО УБИЙСТВА', 'Твоего друга убили из этого пистолета.'],
    [11599, 'intro-arrest', 'МЕСТО УБИЙСТВА', 'А нашли в твоём кармане.'],
    [14799, 'intro-cell-v2', 'ТЮРЬМА', 'Я найду настоящего убийцу.'],
    [15899, 'intro-escape-v2', 'ПОБЕГ', ''],
    [17499, 'intro-controller', 'ТРОЛЛЕЙБУС', 'Ваш билет.'],
    [20499, 'intro-controller', 'ТРОЛЛЕЙБУС', 'Я был вынужден разобраться.'],
    [21299, 'intro-controller-after-v2', 'ТРОЛЛЕЙБУС', ''],
    [24099, 'intro-confrontation-v2', 'БИЛЬЯРДНАЯ', 'Ты убил моего друга.'],
    [24899, 'intro-billiards', 'БИЛЬЯРДНАЯ', ''],
    [27899, 'intro-court-v2', 'СУД', 'Вы признаны невиновным.'],
  ] as const;
  expect(await page.locator('#art').evaluate((image) => getComputedStyle(image).transitionDuration)).toBe('0s');
  for (const [time, image, setting, text] of moments) {
    await page.locator('#scrub').fill(String(time));
    await expect(page.locator('#art')).toHaveAttribute('src', new RegExp(`${image}.webp$`));
    await expect(page.locator('#caption-typed')).toHaveText(text);
    await expect(page.locator('#scene-setting')).toBeVisible();
    await expect(page.locator('#scene-setting')).toHaveText(`РАНЕЕ · ${setting}`);
    expect(await page.locator('#art').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  }
  await page.locator('#scrub').fill('27900');
  await expect(page.locator('#title-card')).toBeVisible();
  await expect(page.locator('#title-card-title')).toHaveText('СЕЙЧАС');
  await expect(page.locator('#scene-setting')).toBeHidden();
  await page.locator('#scrub').fill('34499');
  await expect(page.locator('#caption-typed')).toHaveText('Меня же оправдали.');
  await expect(page.locator('#scene-setting')).toHaveText('СЕЙЧАС · РЕГИСТРАЦИЯ НА ТУРНИР');
  await page.locator('#scrub').fill('36300');
  await expect(page.locator('#subtitle')).toBeHidden();
  await page.locator('#scrub').fill('38899');
  await expect(page.locator('#caption-typed')).toHaveText('Турнир завтра.');
  await expect(page.locator('#title-card')).toBeHidden();
  await page.locator('#scrub').fill('38900');
  await expect(page.locator('#title-card')).toBeVisible();
  await expect(page.locator('#title-card-eyebrow')).toHaveText('Нужна только справка.');
  await expect(page.locator('#scene-setting')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('linked titles wait for a gesture and location captions clear on cards and other scenes', async ({ page }) => {
  await page.goto('./#scene=intro&t=38.9');
  await expect(page.locator('#scrub')).toHaveValue('38900');
  await expect(page.locator('#title-card')).toBeHidden();
  await expect(page.locator('#scene-setting')).toBeHidden();
  await expect(page.locator('#start')).toBeEnabled();
  await page.getByRole('button', { name: 'Выключить звук', exact: true }).click();
  await page.locator('#start').click();
  await expect(page.locator('#title-card')).toBeVisible();
  await page.getByRole('button', { name: 'Предыдущий кадр', exact: true }).click();
  await expect(page.locator('#title-card')).toBeHidden();
  await expect(page.locator('#scene-setting')).toBeVisible();
  await expect(page.locator('#scrub')).toHaveValue('37000');
  await page.getByRole('button', { name: 'Ссылка на этот момент' }).click();
  await expect(page).toHaveURL(/#scene=intro&t=37.0$/);
  await page.reload();
  await expect(page.locator('#scrub')).toHaveValue('37000');
  await page.getByLabel('СЦЕНА', { exact: true }).selectOption('precinct');
  await expect(page.locator('#story-intro')).toHaveText('Мне только\nсправку получить.');
  await expect(page.locator('#stage')).not.toHaveClass(/hard-cuts/);
  await page.locator('[data-cue=fight]').click();
  await expect(page.locator('#fight')).toBeVisible();
  await expect(page.locator('#title-card')).toBeHidden();
  await expect(page.locator('#scene-setting')).toBeHidden();
  await page.getByLabel('СЦЕНА', { exact: true }).selectOption('intro');
  await expect(page.locator('#scrub')).toHaveValue('0');
  await expect(page.locator('#title-card')).toBeHidden();
  await expect(page.locator('#fight')).toBeHidden();
  await expect(page.locator('#story-intro')).toBeVisible();
  await page.locator('[data-cue=murder]').click();
  await expect(page.locator('#scene-setting')).toHaveText('РАНЕЕ · МЕСТО УБИЙСТВА');
  await page.locator('[data-cue=previously]').click();
  await expect(page.locator('#scene-setting')).toBeHidden();
});

test('a missing courtroom panel blocks playback and switching scenes recovers', async ({ page }) => {
  await page.route('**/art/intro-court-v2.webp', (route) => route.abort());
  await page.goto('./#scene=unknown&t=35');
  await expect(page.locator('#scene-select')).toHaveValue('intro');
  await expect(page.locator('#scrub')).toHaveValue('0');
  await expect(page.locator('#status')).toContainText('Не удалось загрузить иллюстрацию');
  await expect(page.locator('#start')).toBeDisabled();
  await expect(page.locator('#play')).toBeDisabled();
  await page.getByLabel('СЦЕНА', { exact: true }).selectOption('queue');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#status')).not.toContainText('Не удалось загрузить иллюстрацию');
  await expect(page.locator('#scene-setting')).toBeHidden();
  await expect(page.locator('#art')).toHaveAttribute('src', /queue-ticket.webp$/);
});

test('recap frames and playback controls fit narrow screens without horizontal scrolling', async ({ page }) => {
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('./#scene=intro&t=24.9');
    await expect(page.locator('#start')).toBeEnabled();
    const layout = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
      stage: document.querySelector('#stage')!.getBoundingClientRect().right,
      controls: document.querySelector('.sound-controls')!.getBoundingClientRect().right,
    }));
    expect(layout.scroll).toBeLessThanOrEqual(layout.client);
    expect(layout.stage).toBeLessThanOrEqual(layout.client);
    expect(layout.controls).toBeLessThanOrEqual(layout.client);
  }
});
