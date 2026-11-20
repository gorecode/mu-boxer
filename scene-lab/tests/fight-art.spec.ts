import { expect, test } from '@playwright/test';

test('all fighter poses decode at their manifest size with transparent cutouts and visible bodies', async ({ page }) => {
  await page.goto('./fight.html');
  await expect(page.locator('#start')).toHaveText('НАЧАТЬ БОЙ →');
  const poses = await page.evaluate(async () => {
    const response = await fetch('./art/fight/manifest.json');
    if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
    const manifest = await response.json() as Record<string, { width: number; height: number; scale: number }[]>;
    return Promise.all(['boxer', 'worker'].flatMap(name => manifest[name].map(async (frame, index) => {
      const image = new Image();
      image.src = `./art/fight/${name}-${index}.webp`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let opaque = 0, transparent = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] >= 200) opaque++;
        if (pixels[i] === 0) transparent++;
      }
      return { name, index, width: image.naturalWidth, height: image.naturalHeight, frame, opaque, transparent };
    })));
  });
  expect(poses).toHaveLength(24);
  for (const pose of poses) {
    const label = `${pose.name}-${pose.index}`;
    expect(pose.width, label).toBe(pose.frame.width);
    expect(pose.height, label).toBe(pose.frame.height);
    expect(pose.opaque, label).toBeGreaterThan(10_000);
    expect(pose.transparent / (pose.width * pose.height), label).toBeGreaterThan(.1);
    expect(pose.frame.scale, label).toBeGreaterThan(0);
  }
});
