import { expect, test, type Page } from '@playwright/test';

async function load(page: Page): Promise<void> {
  await page.clock.install({ time: new Date('2026-11-20T09:00:00Z') });
  await page.goto('./fight.html');
  await expect(page.locator('#start')).toHaveText('НАЧАТЬ БОЙ →');
  await page.clock.pauseAt(new Date('2026-11-20T10:00:00Z'));
}
async function begin(page: Page): Promise<void> {
  await page.locator('#start').click(); await page.clock.runFor(1800);
  await expect(page.locator('#arena')).toHaveAttribute('data-phase', 'fighting');
}
async function number(page: Page, key: string): Promise<number> { return Number(await page.locator('#arena').getAttribute(`data-${key}`)); }

test('standalone fight loads real art and supports keyboard, jump, crouch, pause and clean restart', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await load(page);
  const arenaBox = (await page.locator('.arena-shell').boundingBox())!, introBox = (await page.locator('#intro-card').boundingBox())!;
  expect(introBox.y).toBeGreaterThanOrEqual(arenaBox.y);
  expect(introBox.y + introBox.height).toBeLessThanOrEqual(arenaBox.y + arenaBox.height);
  await expect(page.locator('#player-health')).toHaveAttribute('aria-valuenow', '100');
  await expect(page.locator('#worker-health')).toHaveAttribute('aria-valuenow', '120');
  await begin(page);
  await page.keyboard.down('d'); await page.clock.runFor(500); await page.keyboard.up('d');
  expect(await number(page, 'player-x')).toBeGreaterThan(570);
  await page.keyboard.press('w'); await page.clock.runFor(200); expect(await number(page, 'player-y')).toBeGreaterThan(70);
  await page.clock.runFor(900); expect(await number(page, 'player-y')).toBe(0);
  await page.keyboard.down('s'); await page.keyboard.down('j'); await page.clock.runFor(30);
  await expect(page.locator('#arena')).toHaveAttribute('data-player-action', 'low');
  await page.keyboard.up('s'); await page.keyboard.up('j');
  await page.keyboard.press('Escape');
  await expect(page.locator('#arena')).toHaveAttribute('data-phase', 'paused');
  const position = await number(page, 'player-x'), timer = await page.locator('#timer').textContent();
  await page.clock.runFor(2000); expect(await number(page, 'player-x')).toBe(position); await expect(page.locator('#timer')).toHaveText(timer!);
  await page.locator('#resume').click(); await page.clock.runFor(100);
  await expect(page.locator('#arena')).toHaveAttribute('data-phase', 'fighting');
  await page.keyboard.press('r'); await expect(page.locator('#arena')).toHaveAttribute('data-phase', 'countdown');
  await expect(page.locator('#player-health')).toHaveAttribute('aria-valuenow', '100');
  await expect(page.locator('#worker-health')).toHaveAttribute('aria-valuenow', '120');
  await page.clock.runFor(1750);
  await page.locator('.arena-shell').screenshot({ path: info.outputPath('fight-ready.png') });
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('AI can finish the match, result is stable and restart restores health', async ({ page }) => {
  test.setTimeout(60_000);
  await load(page); await begin(page);
  for (let i = 0; i < 12 && await page.locator('#arena').getAttribute('data-phase') === 'fighting'; i++) await page.clock.runFor(2000);
  await expect(page.locator('#arena')).toHaveAttribute('data-phase', 'loss');
  await expect(page.locator('#result-title')).toHaveText('НЕ ТОТ АРГУМЕНТ.');
  const hp = await page.locator('#player-hp').textContent(); await page.clock.runFor(3000);
  await expect(page.locator('#player-hp')).toHaveText(hp!);
  await page.locator('#restart').click();
  await expect(page.locator('#player-health')).toHaveAttribute('aria-valuenow', '100');
  await expect(page.locator('#worker-health')).toHaveAttribute('aria-valuenow', '120');
});

test('a player can win through actual movement and attacks, then continue to the next story scene', async ({ page }) => {
  test.setTimeout(60_000);
  await load(page); await page.locator('#difficulty').selectOption('warmup'); await begin(page);
  for (let i = 0; i < 260; i++) {
    if (await page.locator('#arena').getAttribute('data-phase') !== 'fighting') break;
    const px = await number(page, 'player-x'), wx = await number(page, 'worker-x');
    await page.keyboard.up('a'); await page.keyboard.up('d'); await page.keyboard.up('k');
    if (Math.abs(px - wx) > 215) await page.keyboard.down(wx > px ? 'd' : 'a');
    else await page.keyboard.down('k');
    await page.clock.runFor(180);
  }
  await page.keyboard.up('a'); await page.keyboard.up('d'); await page.keyboard.up('k');
  await expect(page.locator('#arena')).toHaveAttribute('data-phase', 'win');
  await expect(page.locator('#result-title')).toHaveText('ВОПРОС РЕШЁН.');
  await expect(page.locator('#next-scene')).toHaveAttribute('href', './index.html#scene=precinct&t=0');
});

test('pointer controls release on cancellation and tab loss pauses without stuck movement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await load(page); await begin(page);
  await expect(page.locator('.touch-controls')).toBeVisible();
  const right = page.locator('[data-input=right]'), box = (await right.boundingBox())!;
  await page.mouse.move(box.x + box.width/2, box.y + box.height/2); await page.mouse.down();
  await page.clock.runFor(300); expect(await number(page, 'player-x')).toBeGreaterThan(500);
  await right.dispatchEvent('pointercancel', { pointerId: 1 }); await page.mouse.up();
  const x = await number(page, 'player-x'); await page.clock.runFor(100); expect(await number(page, 'player-x')).toBeCloseTo(x, 0);
  await page.keyboard.down('d'); await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#arena')).toHaveAttribute('data-phase', 'paused');
  await page.keyboard.up('d'); await page.locator('#resume').click(); await page.clock.runFor(200);
  expect(await number(page, 'player-x')).toBeCloseTo(x, 0);
});

test('failed art blocks the match, retry recovers and reduced motion remains playable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/art/fight/worker-0.webp', route => route.abort());
  await page.goto('./fight.html');
  await expect(page.locator('#load-status')).toContainText('Не загрузился рисунок');
  await expect(page.locator('#start')).toHaveText('ПОВТОРИТЬ ЗАГРУЗКУ');
  await expect(page.locator('#arena')).toHaveAttribute('data-phase', 'menu');
  await page.unroute('**/art/fight/worker-0.webp'); await page.locator('#start').click();
  await expect(page.locator('#start')).toHaveText('НАЧАТЬ БОЙ →');
  await page.locator('#start').click();
  await expect(page.locator('#arena')).toHaveAttribute('data-phase', 'countdown');
});

test('releasing one movement alias keeps the other held key active', async ({ page }) => {
  await load(page); await begin(page);
  await page.keyboard.down('d'); await page.keyboard.down('ArrowRight'); await page.clock.runFor(150);
  await page.keyboard.up('d'); const before = await number(page, 'player-x');
  await page.clock.runFor(150); expect(await number(page, 'player-x')).toBeGreaterThan(before + 40);
  await page.keyboard.up('ArrowRight'); const stopped = await number(page, 'player-x');
  await page.clock.runFor(150); expect(await number(page, 'player-x')).toBe(stopped);
});

test('invalid pose metadata explains the error and allows a clean retry', async ({ page }) => {
  await page.route('**/art/fight/manifest.json', route => route.fulfill({ json: { boxer: [], worker: [] } }));
  await page.goto('./fight.html');
  await expect(page.locator('#load-status')).toHaveText('Повреждён список поз бойцов.');
  await expect(page.locator('#arena')).toHaveAttribute('data-phase', 'menu');
  await page.unroute('**/art/fight/manifest.json'); await page.locator('#start').click();
  await expect(page.locator('#start')).toHaveText('НАЧАТЬ БОЙ →');
});

test('visible control buttons work with the keyboard and Space still activates the pause button', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await load(page); await begin(page);
  await page.locator('[data-input=left]').focus(); await page.keyboard.down('Space'); await page.clock.runFor(200);
  await page.keyboard.up('Space'); expect(await number(page, 'player-x')).toBeLessThan(380);
  const x = await number(page, 'player-x'); await page.clock.runFor(100); expect(await number(page, 'player-x')).toBe(x);
  await page.locator('#pause').focus(); await page.keyboard.press('Space');
  await expect(page.locator('#arena')).toHaveAttribute('data-phase', 'paused');
});
