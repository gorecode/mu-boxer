import { expect, test } from '@playwright/test';
import { scenes } from '../src/scenes.ts';
import { compileFilm } from '../src/film.ts';
import { visualAt } from '../src/scene.ts';

const scene = scenes.find(scene => scene.id === 'slider')!;
const chapter = compileFilm(scenes).chapters.find(chapter => chapter.scene.id === 'slider')!;

test('GSAP and native preserve framing and paused frames in both seek directions', async ({ page }, testInfo) => {
  const times = [0, 450, 1275, 2100, 3999, 7800, 8350, 9225, 10100, 11700, 14900, 31900, 34400, 9225, 0];
  const native: Buffer[] = [];
  for (const animation of ['native', 'gsap']) {
    await page.goto(`./?animation=${animation}#scene=slider&t=0`);
    await expect(page.locator('#start')).toBeEnabled();
    for (const [index, time] of times.entries()) {
      await page.locator('#scrub').fill(String(time));
      await page.locator('#art').evaluate(async (image: HTMLImageElement) => image.decode());
      const camera = await page.locator('#art').evaluate(image => {
        const style = (image as HTMLElement).style;
        const [x, y] = style.transformOrigin.split(' ').map(parseFloat);
        return { scale: Number(style.transform.match(/scale\(([^)]+)\)/)![1]), x, y };
      });
      for (const key of ['scale', 'x', 'y'] as const) {
        expect(camera[key]).toBeCloseTo(visualAt(scene, time).camera[key], 5);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      const frame = await page.locator('#stage').screenshot({ animations: 'disabled' });
      if (animation === 'native') native.push(frame);
      else {
        if (!frame.equals(native[index])) {
          const difference = await page.evaluate(async (sources) => {
            const images = await Promise.all(sources.map(async source => {
              const image = new Image();
              image.src = `data:image/png;base64,${source}`;
              await image.decode();
              const canvas = document.createElement('canvas');
              canvas.width = image.width; canvas.height = image.height;
              const context = canvas.getContext('2d')!;
              context.drawImage(image, 0, 0);
              return context.getImageData(0, 0, canvas.width, canvas.height);
            }));
            const [left, right] = images;
            if (left.width !== right.width || left.height !== right.height) throw new Error('Different frame dimensions');
            let changed = 0;
            let maximum = 0;
            for (let i = 0; i < left.data.length; i += 4) {
              const delta = Math.max(...[0, 1, 2, 3].map(channel => Math.abs(left.data[i + channel] - right.data[i + channel])));
              if (delta) changed++;
              maximum = Math.max(maximum, delta);
            }
            return { maximum, ratio: changed / (left.width * left.height) };
          }, [native[index].toString('base64'), frame.toString('base64')]);
          if (difference.maximum > 2 || difference.ratio > 0.0001) {
            await testInfo.attach('native', { body: native[index], contentType: 'image/png' });
            await testInfo.attach('gsap', { body: frame, contentType: 'image/png' });
          }
          expect(difference.maximum, `channel difference at ${time}ms`).toBeLessThanOrEqual(2);
          expect(difference.ratio, `pixel difference at ${time}ms`).toBeLessThanOrEqual(0.0001);
        }
      }
      await expect(page.locator('#play')).toHaveAttribute('aria-label', 'Воспроизвести');
    }
  }
});

test('GSAP follows the player clock at 2x, freezes on pause and uses local film time', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T08:00:00Z') });
  await page.goto('./#scene=slider&t=0');
  await expect(page.locator('#start')).toBeEnabled();
  await page.clock.pauseAt(new Date('2026-01-01T09:00:00Z'));
  await page.locator('#mute').click();
  await page.locator('#speed').selectOption('2');
  await page.locator('#scrub').fill('8350');
  await page.locator('#play').click();
  await page.clock.runFor(400);
  const time = Number(await page.locator('#scrub').inputValue());
  expect(time).toBeGreaterThan(9100);
  expect(time).toBeLessThan(9200);
  const expected = visualAt(scene, time).camera;
  const scale = await page.locator('#art').evaluate(image => Number((image as HTMLElement).style.transform.match(/scale\(([^)]+)\)/)![1]));
  expect(scale).toBeCloseTo(expected.scale, 5);
  await page.locator('#play').click();
  const frozen = await page.locator('#art').getAttribute('style');
  await page.clock.runFor(1000);
  await expect(page.locator('#art')).toHaveAttribute('style', frozen!);
  await page.locator('#mode-select').selectOption('film');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#scrub').fill(String(chapter.start + 9225));
  await expect(page.locator('#scene-select')).toHaveValue('slider');
  await expect(page.locator('#art')).toHaveCSS('transform', 'matrix(1.7, 0, 0, 1.7, 0, 0)');
  await page.locator('#scrub').fill(String(chapter.start + 1275));
  await expect(page.locator('#art')).toHaveCSS('transform', 'matrix(1.8, 0, 0, 1.8, 0, 0)');
  await page.locator('#mode-select').selectOption('scene');
  await expect(page.locator('#art')).toHaveCSS('transform', 'matrix(1.8, 0, 0, 1.8, 0, 0)');
  await page.locator('#scene-select').selectOption('precinct');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#scene-select').selectOption('slider');
  await expect(page.locator('#art')).toHaveCSS('transform', 'matrix(2.6, 0, 0, 2.6, 0, 0)');
});

test('reduced motion keeps shot-start framing and preserves cuts with GSAP enabled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#scene=slider&t=0');
  await expect(page.locator('#start')).toBeEnabled();
  await page.locator('#scrub').fill('9225');
  await expect(page.locator('#art')).toHaveCSS('transform', 'matrix(2.4, 0, 0, 2.4, 0, 0)');
  await page.locator('#scrub').fill('10100');
  await expect(page.locator('#art')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#scrub').fill('9225');
  await expect(page.locator('#art')).toHaveCSS('transform', 'matrix(1.7, 0, 0, 1.7, 0, 0)');
});
