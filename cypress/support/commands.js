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

Cypress.Commands.add('stubJson', (method, url, body, alias, overrides = {}) => {
  if (!alias) throw new Error('stubJson requires an alias');

  cy.intercept(method, url, {
    statusCode: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
    body,
    ...overrides,
  }).as(alias);
});
