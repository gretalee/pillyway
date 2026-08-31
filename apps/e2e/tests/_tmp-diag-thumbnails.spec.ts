import { expect, test } from '@playwright/test';
import * as path from 'path';
import {
  createMockCamino,
  DEFAULT_CAMINO_SEED_DATA,
  deleteCaminoViaUI,
  deleteMockWaypoints,
  loginAs,
  logout,
  setLanguageTo,
} from './helpers';

test('diag: camino gallery + accommodation image thumbnails render live', async ({ page }) => {
  await setLanguageTo(page, 'en');
  const email = process.env.E2E_PILGRIM_EMAIL!;
  const password = process.env.E2E_PILGRIM_PASSWORD!;
  await loginAs(page, email, password);

  const suffix = ` DIAGTHUMB${Date.now()}`;
  const created = await createMockCamino(page, {
    camino: { ...DEFAULT_CAMINO_SEED_DATA.camino, name: 'DiagThumb' },
    points: DEFAULT_CAMINO_SEED_DATA.points.map((p) => ({ ...p, name: `${p.name}${suffix}` })),
  });
  const testImagePath = path.join(__dirname, '_fixtures', 'test-image.jpg');

  try {
    // ─── Upload the primary picture first (so the hero <Image> can also
    // be spot-checked to confirm it does NOT use a thumbnail) ────────────
    await page.goto(`/caminos/${created.slug}`);
    const primaryInput = page
      .getByRole('button', { name: 'Add main picture' })
      .locator('xpath=preceding-sibling::input[@type="file"][1]');
    await primaryInput.setInputFiles(testImagePath);
    await page.waitForResponse(
      (res) => res.request().method() === 'POST' && res.url().includes('/pictures'),
      { timeout: 15_000 },
    );
    await page.waitForTimeout(500);
    await page.reload();

    const heroImg = page.getByRole('img').filter({ hasNot: page.locator('svg') }).first();
    await expect(heroImg, 'hero image must be visible').toBeVisible({ timeout: 10_000 });
    const heroSrc = await heroImg.getAttribute('src');
    console.log('HERO IMG SRC:', heroSrc);
    expect(heroSrc, 'hero image must NOT use the thumbnail derivative').not.toContain(
      '-thumb.webp',
    );

    // ─── Upload a gallery picture, precisely targeting the gallery input
    // via its sibling relationship to the "Add pictures" button ──────────
    const galleryInput = page
      .getByRole('button', { name: 'Add pictures' })
      .locator('xpath=preceding-sibling::input[@type="file"][1]');
    await galleryInput.setInputFiles(testImagePath);
    await page.waitForResponse(
      (res) => res.request().method() === 'POST' && res.url().includes('/pictures'),
      { timeout: 15_000 },
    );
    await page.waitForTimeout(500);
    await page.reload();

    const galleryImg = page.locator('ul img').first();
    await expect(galleryImg, 'gallery thumbnail image must be visible').toBeVisible({
      timeout: 10_000,
    });
    const gallerySrc = await galleryImg.getAttribute('src');
    console.log('GALLERY IMG SRC:', gallerySrc);
    expect(gallerySrc, 'gallery grid must request the -thumb.webp derivative').toContain(
      '-thumb.webp',
    );

    // ─── Upload an accommodation image and check its grid thumbnail too ──
    const stageRes = await page.request.get(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3033/api'}/caminos/${created.id}/stages/1`,
    );
    const stage1 = (await stageRes.json()) as { startPoint: { slug: string } };
    await page.goto(`/waypoints/${stage1.startPoint.slug}`);
    await page.getByRole('link', { name: 'Add accommodation' }).click();
    await page.waitForURL(/\/accommodations\/new$/, { timeout: 10_000 });
    await page.getByLabel('Name').fill('Diag Test Accommodation');
    await page.getByLabel('Type').selectOption('hostel');
    await page.locator('input[type="file"]').setInputFiles(testImagePath);
    await page.waitForTimeout(1500); // upload processing
    await page.getByRole('button', { name: 'Add accommodation' }).click();
    await page.waitForURL(`/waypoints/${stage1.startPoint.slug}`, { timeout: 15_000 });

    await page.reload();
    const accImg = page.locator('ul img').first();
    await expect(accImg, 'accommodation thumbnail image must be visible').toBeVisible({
      timeout: 10_000,
    });
    const accSrc = await accImg.getAttribute('src');
    console.log('ACCOMMODATION IMG SRC:', accSrc);
    expect(accSrc, 'accommodation grid must request the -thumb.webp derivative').toContain(
      '-thumb.webp',
    );
  } finally {
    await deleteCaminoViaUI(page, created.slug);
    await deleteMockWaypoints(page, created.caminoPoints);
    await logout(page);
  }
});
