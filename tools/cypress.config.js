import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    viewportWidth: 980,
    viewportHeight: 1835,
    video: false,
    screenshotOnRunFailure: false,
    supportFile: 'tools/cypress/support/e2e.js',
    fixturesFolder: 'tools/cypress/fixtures',
    downloadsFolder: 'tools/cypress/downloads',
    specPattern: 'tools/cypress/e2e/**/*.cy.js',
    setupNodeEvents() {
      // implement node event listeners here
    },
  },
});
