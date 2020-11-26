context("Login route", () => {
  beforeEach(() => {
    cy.visit("/login");
  });

  it("open login page", () => {
    cy.get("body").find("button").contains("Login").should("exist");
    cy.get("body").type("{enter}");
  });
});
