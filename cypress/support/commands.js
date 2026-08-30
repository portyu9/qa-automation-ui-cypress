Cypress.Commands.add('getByTestId', (testId, options = {}) => {
  return cy.get(`[data-test="${testId}"]`, options);
});

Cypress.Commands.add('login', (username, password) => {
  cy.getByTestId('username').should('be.visible').clear().type(username, { log: false });
  cy.getByTestId('password').should('be.visible').clear().type(password, { log: false });
  return cy.getByTestId('login-button').should('be.enabled').click();
});

Cypress.Commands.add('visitApp', (path = '/') => {
  return cy.visit(path, {
    retryOnNetworkFailure: true,
    retryOnStatusCodeFailure: false,
  });
});

Cypress.Commands.add('stubJson', (method, url, body, alias, overrides = {}) => {
  const normalizedAlias = typeof alias === 'string' ? alias.trim() : '';
  if (!normalizedAlias || normalizedAlias.startsWith('@')) {
    throw new Error('stubJson requires a non-empty alias without the @ prefix');
  }

  return cy.intercept(method, url, {
    statusCode: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
    body,
    ...overrides,
  }).as(normalizedAlias);
});
