// Custom Cypress commands for the project

// Add a custom command to wait for React to be ready
Cypress.Commands.add('waitForReact', () => {
  cy.window().should('have.property', 'React');
});

// Add a command to clear local storage and start fresh
Cypress.Commands.add('resetApp', () => {
  cy.clearLocalStorage();
  cy.reload();
});
