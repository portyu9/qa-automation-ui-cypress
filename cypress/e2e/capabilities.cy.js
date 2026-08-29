describe('Cypress capability contracts', () => {
  it('coordinates intercept aliases, retryable DOM assertions, and node tasks', () => {
    cy.stubJson(
      'GET',
      '/api/profile',
      { id: 42, name: 'Grace Hopper' },
      'profileRequest'
    );

    cy.visitApp('/capabilities.html');
    cy.getByTestId('load-profile').click();

    cy.wait('@profileRequest').then((interception) => {
      expect(interception.request.method).to.equal('GET');
      expect(interception.response.statusCode).to.equal(200);
      expect(interception.response.body).to.deep.equal({ id: 42, name: 'Grace Hopper' });
    });

    cy.getByTestId('profile-output').should('have.text', 'Grace Hopper');
    cy.task('log', 'network capability contract complete').should('equal', null);
  });

  it('restores browser state through cy.session with an explicit validation contract', () => {
    cy.session(
      'capability-state',
      () => {
        cy.visitApp('/capabilities.html');
        cy.window().then((win) => {
          win.localStorage.setItem('capability-token', 'session-owned');
        });
      },
      {
        validate() {
          cy.request('/health').its('status').should('equal', 200);
        },
      }
    );

    cy.visitApp('/capabilities.html');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('capability-token')).to.equal('session-owned');
    });
  });

  it('controls application timers deterministically with cy.clock and cy.tick', () => {
    cy.clock();
    cy.visitApp('/capabilities.html');

    cy.getByTestId('start-timer').click();
    cy.getByTestId('timer-output').should('have.text', 'pending');

    cy.tick(999);
    cy.getByTestId('timer-output').should('have.text', 'pending');

    cy.tick(1);
    cy.getByTestId('timer-output').should('have.text', 'complete');
  });
});
