import { defineConfig, devices } from '@playwright/test';

const releaseGateSpecs = [/performance\.spec\.ts/, /visual\.spec\.ts/];
const currentLocationSpec = /current-location\.spec\.ts/;
const standardFunctionalIgnores = [...releaseGateSpecs, currentLocationSpec];

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	// Map-heavy projects create multiple WebGL contexts. Keep local and CI runs
	// below Chromium's practical context limit so failures reflect the app.
	workers: 2,
	forbidOnly: !!process.env.CI,
	reporter: 'list',
	use: {
		baseURL: 'http://127.0.0.1:4322',
		trace: 'retain-on-failure',
	},
	projects: [
		{
			name: 'mobile-chromium',
			testIgnore: standardFunctionalIgnores,
			use: { ...devices['iPhone 13'], browserName: 'chromium' },
		},
		{
			name: 'desktop-chromium',
			testIgnore: standardFunctionalIgnores,
			use: { ...devices['Desktop Chrome'], browserName: 'chromium' },
		},
		{
			name: 'android-location-chromium',
			testMatch: currentLocationSpec,
			testIgnore: releaseGateSpecs,
			use: { ...devices['Pixel 5'], browserName: 'chromium' },
		},
		{
			name: 'mobile-webkit',
			testMatch: /(?:mobile-map-layout|current-location)\.spec\.ts/,
			testIgnore: releaseGateSpecs,
			use: { ...devices['iPhone 13'], browserName: 'webkit' },
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
