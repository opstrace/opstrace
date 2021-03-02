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

import React, { useEffect, useState, useRef } from "react";
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

import { alertManagerConfigSchema } from "client/validation/alertmanagerConfig";
import * as yamlParser from "js-yaml";

type EditorProps = {
  config: string;
  onChange: Function;
};

const Editor = ({ config, onChange }: EditorProps) => {
  const model = useRef<monaco.editor.IModel | null>(null);

  useEffect(() => {
    yaml &&
      yaml.yamlDefaults.setDiagnosticsOptions({
        validate: true,
        enableSchemaRequest: true,
        hover: true,
        completion: true,
        schemas: []
      });
  }, []);

  useEffect(() => {
    if (!model.current) {
      model.current = monaco.editor.createModel(config, "yaml");
      model.current.onDidChangeContent(data => {
        onChange(model.current?.getValue() || "");
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
  const [config, setConfig] = useState<string>(savedConfig);
  const [configValid, setConfigValid] = useState<boolean | null>(null);
  const dispatch = useDispatch();

  useEffect(() => {
    setConfig(savedConfig);
    setConfigValid(null);
  }, [savedConfig]);

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
                  <Editor config={config} onChange={setConfig} />
                </Box>
              </CardContent>
              <Button
                variant="contained"
                state="primary"
                onClick={() => {
                  dispatch(
                    saveAlertmanagerConfig({
                      tenantName: tenant.name,
                      config: config
                    })
                  );
                }}
              >
                publish
              </Button>
              <Button
                variant="contained"
                state="secondary"
                onClick={() => {
                  // validateYaml(config);
                  alertManagerConfigSchema
                    .isValid(yamlParser.load(config))
                    .then(function (valid: boolean) {
                      setConfigValid(valid);
                    });
                }}
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

// const validateYaml = (config: string) => {
//   const doc = yamlParser.load(config);
//   schema.isValid(doc).then(function (valid: boolean) {
//     console.log("valid", valid);
//   });
//   // .validate(doc)
//   // .catch(function (err: object) {
//   //   console.log("error", err);
//   // });
// };

export default AlertmanagerConfigEditor;
