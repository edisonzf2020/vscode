/**
 * Playwright Configuration for Mini VSCode E2E Tests
 */

module.exports = {
    testDir: './test/e2e',
    timeout: 30000,
    fullyParallel: false, // Run tests sequentially for Electron
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // Single worker for Electron tests
    reporter: [
        ['html'],
        ['list']
    ],
    use: {
        // Global test settings
        actionTimeout: 10000,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },
    projects: [
        {
            name: 'electron',
            testMatch: '**/*test*.js',
            use: {
                // Electron-specific settings
            }
        }
    ]
};
