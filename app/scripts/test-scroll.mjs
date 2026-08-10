import { chromium, webkit } from 'playwright';

(async () => {
	const browser = await webkit.launch();
	const page = await browser.newPage();
	await page.setContent(`
		<html style="overflow: hidden; height: 100%;">
			<body style="overflow: hidden; height: 100%; margin: 0;">
				<div style="height: 5000px; background: linear-gradient(red, blue);"></div>
			</body>
		</html>
	`);
	await page.evaluate(() => window.scrollTo(0, 1200));
	console.log('ScrollY after scrollTo:', await page.evaluate(() => window.scrollY));
	await browser.close();
})();
