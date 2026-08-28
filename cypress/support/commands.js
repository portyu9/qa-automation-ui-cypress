Cypress.Commands.add('getByTestId', (testId, options = {}) => {
  return cy.get(`[data-test="${testId}"]`, options);
});

Cypress.Commands.add('login', (username, password) => {
  cy.getByTestId('username').should('be.visible').clear().type(username, { log: false });
  cy.getByTestId('password').should('be.visible').clear().type(password, { log: false });
  cy.getByTestId('login-button').should('be.enabled').click();
});

Cypress.Commands.add('visitApp', (path = '/') => {
  cy.visit(path, {
    retryOnNetworkFailure: true,
    retryOnStatusCodeFailure: false,
  });
});
