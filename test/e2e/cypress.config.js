import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    viewportWidth: 980,
    viewportHeight: 1835,
    video: false,
    screenshotOnRunFailure: false,
    supportFile: 'test/e2e/support/e2e.js',
    fixturesFolder: 'test/e2e/fixtures',
    downloadsFolder: 'test/e2e/downloads',
    specPattern: 'test/e2e/specs/**/*.cy.js',
    setupNodeEvents() {
      // implement node event listeners here
    },
  },
});
