import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    viewportWidth: 980,
    viewportHeight: 1835,
    video: false,
    screenshotOnRunFailure: false,
    setupNodeEvents() {
      // implement node event listeners here
    },
  },
});
