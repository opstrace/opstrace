describe("Root route", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("expand sidebar item", () => {
    console.log(Cypress.env());

    cy.get("li[role='treeitem']").first().contains("@opstrace").click();
    cy.get("li[role='treeitem']").first().should("have.attr", "aria-expanded", "true");

    cy.get("li[role='treeitem']").first().contains("@opstrace").click();
    cy.get("li[role='treeitem']").first().should("have.attr", "aria-expanded", "false");
  });

  it("change url by clicking on sidebar items", () => {
    cy.get("li[role='treeitem']").contains("@opstrace").click();
    cy.url().should("include", "@opstrace");

    cy.get("li[role='treeitem']").contains("@me").click();
    cy.url().should("include", "@me");
  });

  it("open Picker", () => {
    cy.get("body").find("div[role='dialog']").should("not.exist");
    cy.get("body").type("{shift}{command}p");
    cy.get("body").find("div[role='dialog']").should("exist");
  });

  it("close sidebar", () => {
    cy.get("body").find(".Pane.vertical.Pane1").should("exist");

    cy.get("body").type("{shift}{command}p");
    cy.get("input[aria-label='picker filter']").type("Toggle Sidebar visibility{enter}");

    cy.get("body").find(".Pane.vertical.Pane1").should("not.exist");
  });
});

describe("Root route with unknown module", () => {
  beforeEach(() => {
    cy.visit("/@no/module/exist");
  });

  it("shows module not exist message", () => {
    cy.wait(500);
    cy.get("span").contains("Module does not exist");
    cy.get("button").contains("Home").click();
    cy.url().should("eq", `${Cypress.config().baseUrl}/`);
  });
});
