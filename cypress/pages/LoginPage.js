/**
 * Page Object for the Sauce Demo login page.  Encapsulates all selectors and
 * page interactions so tests don’t have to know CSS details.  Using classes
 * like this helps keep your tests expressive and easy to maintain.
 */
class LoginPage {
  /** Navigate to the login page (root of the application). */
  visit() {
      cy.visit('/', { failOnStatusCode: false, pageLoadTimeout: 0 });
  }

  /** Username input element. */
  get username() {
    return cy.get('[data-test="username"]');
  }

  /** Password input element. */
  get password() {
    return cy.get('[data-test="password"]');
  }

  /** Login button element. */
  get loginButton() {
    return cy.get('[data-test="login-button"]');
  }

  /**
   * Perform a login action.
   *
   * @param {string} username - The username to enter
   * @param {string} password - The password to enter
   */
  login(username, password) {
    this.username.clear().type(username);
    this.password.clear().type(password);
    this.loginButton.click();
  }

  /** Locator for the error message container. */
  errorMessage() {
    return cy.get('[data-test="error"]');
  }
}

export default LoginPage;
