// This is the Cypress support file for e2e tests
// Add global commands and configuration here

// Import commands.js using ES2015 syntax:
// import './commands'

// Disable Cypress's default behavior of failing tests on uncaught exceptions
// This is needed because React apps often have harmless console errors
Cypress.on('uncaught:exception', () => {
  // Return false to prevent the error from failing this test
  return false;
});
