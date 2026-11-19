import { expect, test } from '@playwright/test';

test('lunch, the revealed chief, unanswered phone and anger retain exact scene boundaries', async ({ page }) => {
  await page.goto('./#scene=bandit&t=0');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#title')).toHaveText('Там не ответят');
  for (const [at, image, text] of [[3999, 'queue-v2', 'Наконец я добрался до окошка.'],
    [4000, 'queue-v2', ''], [5600, 'door-v1', ''], [8599, 'door-v1', 'Я пошёл к начальнику.'],
    [8600, 'office-v2', ''], [11599, 'office-v2', 'Ты?! Как ты здесь…'],
    [15099, 'office-v2', 'На этот раз ты сядешь надолго.'], [15100, 'phone-v1', ''],
    [19499, 'phone-v1', 'Там не ответят.'], [19500, 'office-v2', ''],
    [24049, 'office-v2', 'Тогда я разберусь с тобой по-своему.'], [24549, 'office-v2', ''],
    [24550, 'angry-v1', ''], [25199, 'angry-v1', '']] as const) {
    await page.locator('#scrub').fill(String(at));
    await expect(page.locator('#art')).toHaveAttribute('src', new RegExp(`bandit-${image}.webp$`));
    await expect(page.locator('#caption-typed')).toHaveText(text);
    await expect(page.locator('#fight')).toBeHidden();
  }
  await page.locator('#scrub').fill('25200');
  await expect(page.locator('#art')).toHaveAttribute('src', /bandit-final-v1.webp$/);
  await expect(page.locator('#fight')).toBeVisible();
  await expect(page.locator('#opponent')).toHaveText('БАНДИТА');
  await expect(page.locator('#scene-flash')).toBeHidden();
});

test('final art and title appear together through a playing-only flash; reduced motion suppresses it', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T08:00:00Z') });
  await page.goto('./#scene=bandit&t=25.1');
  await expect(page.locator('#start')).toBeEnabled();
  await page.clock.pauseAt(new Date('2026-01-01T09:00:00Z'));
  await page.locator('#mute').click();
  await page.locator('#start').click();
  await page.clock.runFor(50);
  await expect(page.locator('#art')).toHaveAttribute('src', /bandit-angry-v1.webp$/);
  await expect(page.locator('#fight')).toBeHidden();
  await page.clock.runFor(100);
  await expect(page.locator('#art')).toHaveAttribute('src', /bandit-final-v1.webp$/);
  await expect(page.locator('#fight')).toBeVisible();
  await expect(page.locator('#scene-flash')).toBeVisible();
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  await expect(page.locator('#scene-flash')).toBeHidden();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#scrub').fill('25200');
  await page.getByRole('button', { name: 'Воспроизвести', exact: true }).click();
  await page.clock.runFor(30);
  await expect(page.locator('#scene-flash')).toBeHidden();
});

test('the epilogue reveals aftermath, recalls ordinary people and discards the blank before the clenched-fist exit', async ({ page }) => {
  await page.goto('./#scene=epilogue&t=0');
  await expect(page.locator('#start')).toBeEnabled();
  for (const [at, image, text] of [[5299, 'epilogue-aftermath-v1', 'Сегодня свой турнир по боксу я выиграл.'],
    [8799, 'epilogue-aftermath-v1', 'И завтра выиграю районный.'], [8800, 'epilogue-doorway-v2', ''],
    [10499, 'epilogue-doorway-v2', 'Но…'], [14299, 'epilogue-doorway-v2', 'Этот город прогнил насквозь.'],
    [16699, 'worker-wide-v2', 'Все эти люди.'], [19299, 'precinct-idle', 'Продажные чиновники.'],
    [21099, 'intro-court-v2', 'Судьи.'], [23199, 'animator-wide-v2', 'Бандиты.'],
    [27399, 'epilogue-doorway-v2', 'Этому городу нужен новый герой.'],
    [32699, 'epilogue-crumple-v1', 'Который научит ценить и уважать закон…'],
    [32700, 'epilogue-discard-v1', ''], [33499, 'epilogue-discard-v1', ''],
    [36799, 'epilogue-exit-v1', 'И порядок.']] as const) {
    await page.locator('#scrub').fill(String(at));
    await expect(page.locator('#art')).toHaveAttribute('src', new RegExp(`${image}.webp$`));
    await expect(page.locator('#caption-typed')).toHaveText(text);
    await expect(page.locator('#fight')).toBeHidden();
    expect(await page.locator('#art').evaluate((img: HTMLImageElement) => img.naturalWidth > 0)).toBe(true);
  }
  await page.locator('#scrub').fill('39000');
  await expect(page.locator('#title-card')).toBeVisible();
  await expect(page.locator('#title-card-title')).toHaveText('КОНЕЦ');
  await expect(page.locator('#play')).toHaveAttribute('aria-label', 'Воспроизвести');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('an outgoing unanswered call emits two procedural ringbacks rather than a police reply', async ({ page }) => {
  await page.addInitScript(() => {
    const browser = window as unknown as Window & { ringbacks: number[] };
    browser.ringbacks = [];
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      createOscillator(): OscillatorNode {
        const oscillator = super.createOscillator();
        const original = oscillator.frequency.setValueAtTime.bind(oscillator.frequency);
        oscillator.frequency.setValueAtTime = (value, time) => {
          if (value === 425) browser.ringbacks.push(value);
          return original(value, time);
        };
        return oscillator;
      }
    };
  });
  await page.goto('./#scene=bandit&t=15.1');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#start').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Window & { ringbacks: number[] }).ringbacks)).toEqual([425, 425]);
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  await page.locator('#scrub').fill('19499');
  await expect(page.locator('#caption-typed')).toHaveText('Там не ответят.');
});
