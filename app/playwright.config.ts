import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	reporter: 'list',
	use: {
		baseURL: 'http://127.0.0.1:4322',
		trace: 'retain-on-failure',
	},
	projects: [
		{ name: 'mobile-chromium', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
		{ name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], browserName: 'chromium' } },
	],
});
