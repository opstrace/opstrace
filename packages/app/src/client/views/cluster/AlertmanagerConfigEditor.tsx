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

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useDispatch } from "state/provider";

import Skeleton from "@material-ui/lab/Skeleton";
//import { useDispatch } from "react-redux";

import { Box } from "client/components/Box";

import Layout from "client/layout/MainContent";
import SideBar from "./Sidebar";
import { YamlEditor } from "client/components/Editor";
import { yaml } from "workers";

import { Card, CardContent, CardHeader } from "client/components/Card";
import { Button } from "client/components/Button";
import { useTenant, useAlertmanagerConfig } from "state/tenant/hooks";
import { saveAlertmanagerConfig } from "state/tenant/actions";

import { alertmanagerConfigSchema } from "client/validation/alertmanagerConfig";
import * as yamlParser from "js-yaml";

import jsonSchema from "client/validation/alertmanagerConfig/schema.json";

type EditorProps = {
  filename: string;
  config: string;
  onChange?: Function;
};

const Editor = ({ filename, config, onChange }: EditorProps) => {
  const model = useRef<monaco.editor.IModel | null>(null);

  console.log("Editor", "render", filename, config)

  useEffect(() => {
    yaml &&
      yaml.yamlDefaults.setDiagnosticsOptions({
        validate: true,
        enableSchemaRequest: true,
        hover: true,
        completion: true,
        schemas: [
          {
            uri: "http://opstrace.com/alertmanager-schema.json", // id of the first schema
            fileMatch: [filename], // associate with our model
            schema: jsonSchema
          }
        ]
      });
  }, []);

  useEffect(() => {
    if (!model.current) {
      model.current = monaco.editor.createModel(
        config,
        "yaml",
        monaco.Uri.parse(filename)
      );
      model.current.onDidChangeContent(data => {
        if (onChange) onChange(model.current?.getValue() || "");
      });
    } else if (model.current?.getValue() !== config)
      model.current?.setValue(config);
  }, [config]);

  if (model.current === null) return null;

  return <YamlEditor model={model.current} />;
};

const AlertmanagerConfigEditor = () => {
  const params = useParams<{ tenant: string }>();
  const tenant = useTenant(params.tenant);
  const savedConfig = useAlertmanagerConfig(params.tenant) || "";
  const configRef = useRef(savedConfig)
  const [configValid, setConfigValid] = useState<boolean | null>(null);
  const dispatch = useDispatch();

  console.log("AlertmanagerConfigEditor", "render", configRef.current);

  const handleConfigChange = useCallback((newConfig) => {
    console.log("handleConfigChange", "called", newConfig);
    configRef.current = newConfig
  }, [savedConfig])

  const handleSave = useCallback(() => {
    if (tenant) {
      dispatch(
        saveAlertmanagerConfig({
          tenantName: tenant.name,
          config: configRef.current
        })
      )
    }
  }, [tenant?.name])

  const handleValidation = useCallback(() => {
    // validateYaml(config);
    console.log("handleValidation", configRef.current)
    alertmanagerConfigSchema
      .isValid(yamlParser.load(configRef.current))
      .then(function (valid: boolean) {
        setConfigValid(valid);
      });
  }, [tenant?.name])

  if (!tenant)
    return (
      <Layout sidebar={SideBar}>
        <Skeleton variant="rect" width="100%" height="100%" animation="wave" />
      </Layout>
    );
  else
    return (
      <Layout sidebar={SideBar}>
        <Box
          width="100%"
          height="100%"
          display="flex"
          justifyContent="center"
          alignItems="center"
          flexWrap="wrap"
          p={1}
        >
          <Box maxWidth={700}>
            <Card p={3}>
              <CardHeader
                titleTypographyProps={{ variant: "h5" }}
                title={`${tenant.name} / Alertmanager Configuration`}
              />
              <CardContent>
                <Box display="flex" height="500px" width="700px">
                  <Editor
                    filename={`${tenant.name}-alertmanagerConfig.yaml`}
                    config={savedConfig}
                    onChange={handleConfigChange}
                  />
                </Box>
              </CardContent>
              <Button
                variant="contained"
                state="primary"
                onClick={handleSave}
              >
                publish
              </Button>
              <Button
                variant="contained"
                state="secondary"
                onClick={handleValidation}
              >
                validate
              </Button>
              <span>{" " + configValidToStr(configValid)}</span>
            </Card>
          </Box>
        </Box>
      </Layout>
    );
};

const configValidToStr = (isValid: boolean | null) => {
  if (isValid === true) return "Valid Config";
  else if (isValid === false) return "Config not valid";
  return "";
};

export default AlertmanagerConfigEditor;
