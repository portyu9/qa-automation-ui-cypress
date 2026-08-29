import LoginPage from '../pages/LoginPage';
import InventoryPage from '../pages/InventoryPage';

describe('Sauce Demo Login', () => {
  const loginPage = new LoginPage();
  const inventoryPage = new InventoryPage();

  beforeEach(() => {
    loginPage.visit();
  });

  it('logs in with valid credentials', () => {
    cy.fixture('users').then(({ validUser }) => {
      loginPage.login(validUser.username, validUser.password);

      cy.location('pathname').should('eq', '/inventory.html');
      inventoryPage.inventoryItems.should('have.length.at.least', 1);
    });
  });

  it('shows an error for invalid credentials', () => {
    cy.fixture('users').then(({ invalidUser }) => {
      loginPage.login(invalidUser.username, invalidUser.password);

      cy.location('pathname').should('eq', '/');
      loginPage.errorMessage().should('be.visible').and('not.be.empty');
    });
  });
});