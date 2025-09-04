// Custom Cypress commands.
//
// Use this file to define reusable commands that encapsulate repetitive
// sequences of Cypress API calls.  For example, the login command below
// combines filling in credentials and clicking the login button into one
// function.

Cypress.Commands.add('login', (username, password) => {
  cy.get('[data-test="username"]').clear().type(username);
  cy.get('[data-test="password"]').clear().type(password);
  cy.get('[data-test="login-button"]').click();
});

// You can add more custom commands here and import this file in
// `cypress/support/e2e.js`.  Custom commands help reduce duplication and
// improve readability of your tests.
