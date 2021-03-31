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

import React, { useRef, useCallback, useEffect } from "react";
import { debounce } from "lodash";

import { editor } from "monaco-editor/esm/vs/editor/editor.api";
import * as yamlParser from "js-yaml";
import { YamlEditor } from "client/components/Editor";

import { State } from "client/views/tenant/alertmanagerConfig/editor/types";

import { Box } from "client/components/Box";

import {
  alertmanagerConfigSchema,
  jsonSchema
} from "client/validation/alertmanagerConfig";

type validationCheckOptions = {
  useModelMarkers: boolean;
};

const Templates = (props: State) => {
  const { data, setData, setValidation } = props;
  const templatesRef = useRef<string>(data.templates || "");

  useEffect(() => {
    return () => {
      setData({ templates: templatesRef.current });
    };
  }, [setData]);

  const handleChange = useCallback(
    (newTemplates, filename) => {
      const validationCheck: (
        _filename: string,
        _options?: validationCheckOptions
      ) => void = (filename, options) => {
        const markers = options?.useModelMarkers
          ? editor.getModelMarkers({
              resource: monaco.Uri.parse(filename)
            })
          : [];

        if (markers.length === 0) {
          try {
            const parsedData = yamlParser.load(templatesRef.current, {
              schema: yamlParser.JSON_SCHEMA
            });

            alertmanagerConfigSchema
              .validate(parsedData, { strict: true })
              .then((_value: object) => {
                setValidation("templates", true);
              })
              .catch((_err: { name: string; errors: string[] }) => {
                setValidation("templates", false);
              });
          } catch (e) {
            setValidation("templates", false);
          }
        } else {
          setValidation("templates", false);
        }
      };

      const validationCheckOnChangeStart = debounce(validationCheck, 300, {
        leading: true,
        trailing: false
      });
      const checkValidationOnChangePause = debounce(validationCheck, 500, {
        maxWait: 5000
      });

      templatesRef.current = newTemplates;
      validationCheckOnChangeStart(filename);
      checkValidationOnChangePause(filename);
    },
    [setValidation]
  );

  return (
    <Box display="flex" height="500px" width="700px">
      <YamlEditor
        filename="alertmanager-templates.yaml"
        jsonSchema={jsonSchema}
        data={data.templates || ""}
        onChange={handleChange}
      />
    </Box>
  );
};

const TemplateesTab = {
  key: "templates",
  label: "Templates",
  content: Templates
};

export default TemplateesTab;
