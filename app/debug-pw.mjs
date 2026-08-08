import { chromium, devices } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices['Pixel 5']
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.stack));

  console.log('Navigating...');
  await page.goto('http://localhost:4322/picks?origin=Math%20Building&originMode=building&destination=Physical%20Sciences%20Building&break=60');
  
  await page.waitForTimeout(2000);
  console.log('Clicking details...');
  try {
    await page.getByRole('button', { name: 'Details' }).first().click();
    await page.waitForTimeout(1000);
    const isVisible = await page.getByRole('dialog').isVisible();
    console.log('Dialog is visible?', isVisible);
    if (!isVisible) {
      console.log('Not visible!');
    }
  } catch (e) {
    console.log('Could not click details:', e);
  }
  
  console.log('Done.');
  await browser.close();
})();
