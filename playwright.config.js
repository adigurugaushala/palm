// Scaffold only — fill in once Playwright is installed and the app is deployed somewhere a browser can reach.
module.exports = {
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  use: { baseURL: process.env.BASE_URL || 'http://localhost:3000', viewport: { width: 430, height: 880 } },
  projects: [
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { viewport: { width: 1366, height: 768 } } },
  ],
};
