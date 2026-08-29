/** Feature operations for the Sauce Demo inventory page. */
class InventoryPage {
  get inventoryItems() {
    return cy.get('[data-test="inventory-item"]');
  }

  logout() {
    cy.get('#react-burger-menu-btn').click();
    cy.get('#logout_sidebar_link').click();
  }
}

export default InventoryPage;