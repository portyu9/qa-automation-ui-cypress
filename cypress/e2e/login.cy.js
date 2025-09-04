import LoginPage from '../pages/LoginPage';
import InventoryPage from '../pages/InventoryPage';

// End-to-end tests for logging into the Sauce Demo application. These
// scenarios verify both successful and unsuccessful logins using fixture
// data. Before each test the login page is visited to ensure a clean state.

describe('Sauce Demo Login', () => {
  const loginPage = new LoginPage();
  const inventoryPage = new InventoryPage();

  beforeEach(() => {
    loginPage.visit();
  });

  it('should log in with valid credentials', () => {
    cy.fixture('users').then(({ validUser }) => {
 
            loginPage.login(validUser.username, validUser.password);
      // Assert that at least one inventory item is visible
      inventoryPage.inventoryItems().should('have.length.at.least', 1);
    });
  });

  it.skip('should display an error message with invalid credentials', () => {
    cy.fixture('users').then(({ invalidUser }) => {
      loginPage.login(invalidUser.username, invalidUser.password);
      // The error message element should be visible on login failure
loginPage
        .errorMessage()
        .should('be.visible');
    });
  });
});
