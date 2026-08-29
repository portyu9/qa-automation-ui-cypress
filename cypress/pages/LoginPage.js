/** Feature operations for the Sauce Demo login page. */
class LoginPage {
  visit() {
    cy.visit('/');
  }

  get username() {
    return cy.get('[data-test="username"]');
  }

  get password() {
    return cy.get('[data-test="password"]');
  }

  get loginButton() {
    return cy.get('[data-test="login-button"]');
  }

  login(username, password) {
    this.username.clear().type(username);
    this.password.clear({ log: false }).type(password, { log: false });
    this.loginButton.click();
  }

  errorMessage() {
    return cy.get('[data-test="error"]');
  }
}

export default LoginPage;