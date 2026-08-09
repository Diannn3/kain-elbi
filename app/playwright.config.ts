import { defineConfig, devices } from '@playwright/test';

const releaseGateSpecs = [/performance\.spec\.ts/, /visual\.spec\.ts/];

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	reporter: 'list',
	use: {
		baseURL: 'http://127.0.0.1:4322',
		trace: 'retain-on-failure',
	},
	projects: [
		{
			name: 'mobile-chromium',
			testIgnore: releaseGateSpecs,
			use: { ...devices['iPhone 13'], browserName: 'chromium' },
		},
		{
			name: 'desktop-chromium',
			testIgnore: releaseGateSpecs,
			use: { ...devices['Desktop Chrome'], browserName: 'chromium' },
		},
		{
			name: 'performance-chromium',
			testMatch: /performance\.spec\.ts/,
			use: {
				...devices['Desktop Chrome'],
				browserName: 'chromium',
				viewport: { width: 390, height: 844 },
				serviceWorkers: 'block',
			},
		},
		{
			name: 'visual-chromium',
			testMatch: /visual\.spec\.ts/,
			use: { ...devices['Desktop Chrome'], browserName: 'chromium' },
		},
	],
});
