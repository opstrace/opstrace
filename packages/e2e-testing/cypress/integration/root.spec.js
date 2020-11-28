/**
 * Copyright 2020 Opstrace, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
describe("Root route", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("expand sidebar item", () => {
    console.log(Cypress.env());

    cy.get("li[role='treeitem']").first().contains("@opstrace").click();
    cy.get("li[role='treeitem']")
      .first()
      .should("have.attr", "aria-expanded", "true");

    cy.get("li[role='treeitem']").first().contains("@opstrace").click();
    cy.get("li[role='treeitem']")
      .first()
      .should("have.attr", "aria-expanded", "false");
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
    cy.get("input[aria-label='picker filter']").type(
      "Toggle Sidebar visibility{enter}"
    );

    cy.get("body").find(".Pane.vertical.Pane1").should("not.exist");
  });
});

describe("Root route with unknown module", () => {
  beforeEach(() => {
    cy.visit("/@no/module/exist");
  });

  it("shows module not exist message", () => {
    cy.get("span").contains("Module does not exist");
    cy.get("button").contains("Home").click();
    cy.url().should("eq", `${Cypress.config().baseUrl}/`);
  });
});
