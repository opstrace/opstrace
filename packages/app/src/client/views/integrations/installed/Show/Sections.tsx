/**
 * Copyright 2021 Opstrace, Inc.
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

import React from "react";
import { isFunction } from "ramda-adjunct";

import { IntegrationProps } from "client/integrations/types";

import { CondRender } from "client/utils/rendering";

import { Box } from "client/components/Box";
import { Card, CardHeader, CardContent } from "client/components/Card";

export const Sections = (props: IntegrationProps) => {
  return (
    <>
      {(props.plugin.detailSections || []).map(section => {
        return (
          <Box width="100%" height="100%" p={1}>
            <Card>
              <CondRender present={section.label}>
                <CardHeader
                  titleTypographyProps={{ variant: "h5" }}
                  title={
                    isFunction(section.label)
                      ? section.label(props)
                      : section.label
                  }
                />
              </CondRender>
              <CardContent>
                <section.Component {...props} />
              </CardContent>
            </Card>
          </Box>
        );
      })}
    </>
  );
};
