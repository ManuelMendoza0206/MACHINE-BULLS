import { test, expect } from '@playwright/test';

// app-shell/spec.md — "Navegación adaptativa" + "Skip link y landmark".

test('desktop shows TopNav, mobile shows BottomTabBar — CSS only, no console error', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', m => {
    if (m.type() === 'error' && !m.text().includes('ERR_CONNECTION_REFUSED')) {
      errors.push(m.text());
    }
  });

  await page.route('**/api/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/wardrobe');
  await expect(
    page.getByRole('navigation', { name: 'Navegación principal' }).first()
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 800 }); // no reload
  const navs = page.getByRole('navigation', { name: 'Navegación principal' });
  // The bottom bar (fixed, lg:hidden) is the visible one now.
  await expect(navs.last()).toBeVisible();

  expect(errors).toEqual([]);
});

test('keyboard-only: skip link, then navigate to Outfits', async ({ page }) => {
  await page.goto('/wardrobe');

  await page.keyboard.press('Tab'); // → skip link
  await expect(
    page.getByRole('link', { name: /Saltar al contenido|Skip to content/i })
  ).toBeFocused();

  await page.setViewportSize({ width: 1280, height: 800 });
  await page
    .getByRole('link', { name: /Outfits/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/outfits$/);
  await expect(page.getByRole('link', { name: /Outfits/ }).first()).toHaveAttribute(
    'aria-current',
    'page'
  );
});
