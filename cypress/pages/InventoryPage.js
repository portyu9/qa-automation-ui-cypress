/**
 * Page Object for the Sauce Demo inventory page.  After a successful login
 * users are redirected here.  This class exposes common selectors and
 * interactions.
 */
class InventoryPage {
  /** List of all inventory items. */
  get inventoryItems() {
    return cy.get('.inventory_item');
  }

  /**
   * Logout from the application by interacting with the burger menu.  The
   * selectors here are taken from the Sauce Demo DOM.  If they change in
   * future versions you only need to update this method.
   */
  logout() {
    cy.get('#react-burger-menu-btn').click();
    cy.get('#logout_sidebar_link').click();
  }
}

export default InventoryPage;
