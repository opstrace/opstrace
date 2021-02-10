/**
 * Copyright 2019-2021 Opstrace, Inc.
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

import { ServerStyleSheets as MuiSheet } from "@material-ui/core/styles";
import { ServerStyleSheet as StyledSheet } from "styled-components";

/**
 * ServerStyleSheet proxies the collection of stylesheets during SSR for styled-components and material-ui
 */
export default class ServerStyleSheet {
  private muiSheet: MuiSheet;
  private styledSheet: StyledSheet;
  constructor() {
    this.muiSheet = new MuiSheet();
    this.styledSheet = new StyledSheet();
  }
  /**
   * Collect the stylesheets
   * @param element JSX.Element
   */
  public collect(element: JSX.Element): JSX.Element {
    // collect sheets for mui and styled-components
    return this.styledSheet.collectStyles(this.muiSheet.collect(element));
  }
  /**
   * Get the style tags from the sheets. Pass in the id so the client can remove that node.
   * https://material-ui.com/guides/server-rendering/#the-client-side
   * @param id string id for the style tag
   */
  public getStyleTag(id: string): string {
    return `<style id="${id}">${this.muiSheet.toString()}</style>${this.styledSheet.getStyleTags()}`;
  }
  /**
   * seal the styled-components sheet to prevent memory leaks
   */
  public seal(): void {
    this.styledSheet.seal();
  }
}
