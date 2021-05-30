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

import React, { useCallback, useState } from "react";

import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  TextField,
  Switch
} from "@material-ui/core";

import { useTheme } from "@material-ui/core/styles";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@material-ui/icons/KeyboardArrowUp";
import { makeStyles } from "@material-ui/core/styles";
import Tooltip from "@material-ui/core/Tooltip";
import Collapse from "@material-ui/core/Collapse";
import { Card } from "client/components/Card";
import { Typography } from "client/components/Typography";
import SkeletonBody from "./SkeletonBody";
import { CardContent, CardHeader } from "client/components/Card";
import { Button } from "client/components/Button";
import { Box } from "client/components/Box";

import useCortexConfig, {
  useCortexConfigLoaded
} from "state/cortex-config/hooks/useCortexConfig";
import useTenantList from "state/tenant/hooks/useTenantList";
import {
  CortexLimits,
  CortexLimitsKeys,
  CortexLimitsValues,
  CortexLimitsSchemaDescription
} from "state/cortex-config/types";
import { HelpCircle, RotateCcw } from "react-feather";
import { ValidationError } from "yup";
import { useDispatch } from "state/provider";
import * as actions from "state/cortex-config/actions";
import ThousandNumberFormat from "client/components/Form/NumberFormatInput";
import { isEqual } from "lodash";

const entries = Object.entries as <T>(
  o: T
) => [Extract<keyof T, string>, T[keyof T]][];

const useStyles = makeStyles(theme => ({
  tenantHeaderRow: {
    borderBottom: `1px solid ${theme.palette.divider}`
  },
  tenantRow: {
    cursor: "pointer",
    backgroundColor: theme.palette.action.hover
  },
  errorContainer: {
    borderLeft: `4px solid ${theme.palette.error.main}`,
    paddingLeft: theme.spacing(2)
  },
  borderBottom: {
    borderBottom: `1px solid ${theme.palette.divider}`
  }
}));

const CortexConfig = () => {
  const allTenants = useTenantList();
  const loaded = useCortexConfigLoaded();
  const cortexConfig = useCortexConfig();
  const dispatch = useDispatch();

  // Filter out the system tenant. We can provide default overrides in cortex runtime config for this tenant.
  const tenants = allTenants.filter(t => t.type !== "SYSTEM");
  return (
    <>
      <Box pt={3} pb={4} display="flex" justifyContent="space-between">
        <Typography variant="h5">Cortex Tenant Configuration</Typography>
        <Button
          variant="contained"
          state="primary"
          size="medium"
          disabled={!cortexConfig.hasUnsavedChanges}
          onClick={() => {
            cortexConfig.runtimeConfig &&
              dispatch(
                actions.saveCortexRuntimeConfig(cortexConfig.runtimeConfig)
              );
          }}
        >
          {cortexConfig.hasUnsavedChanges ? "Apply Changes" : "No Changes"}
        </Button>
      </Box>
      {cortexConfig.saveRuntimeConfigError && (
        <ErrorPanel message={cortexConfig.saveRuntimeConfigError} />
      )}
      {cortexConfig.loadingError && (
        <ErrorPanel message={cortexConfig.loadingError} />
      )}
      <Box pt={1}>
        <TableContainer component={Card}>
          <Table aria-label="tenants">
            <TableHead></TableHead>
            <TableBody>
              {tenants.map(tenant => {
                const baseLimits: CortexLimits =
                  cortexConfig.config?.limits || ({} as CortexLimits);

                const overrides = cortexConfig.runtimeConfig?.overrides || {};
                let limits: CortexLimits = {} as CortexLimits;

                if (tenant.name in overrides) {
                  limits = overrides[tenant.name];
                }
                if (!loaded) {
                  return (
                    <SkeletonBody
                      key={tenant.name}
                      numberRows={3}
                      numberColumns={3}
                    />
                  );
                }
                return (
                  <TenantConfigRowMemoized
                    key={tenant.name}
                    tenant={tenant.name}
                    limits={limits}
                    baseLimits={baseLimits}
                  />
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>
  );
};

type TenantConfigRowProps = {
  tenant: string;
  limits: CortexLimits;
  baseLimits: CortexLimits;
};

const TenantConfigRow = (props: TenantConfigRowProps) => {
  const { tenant, baseLimits, limits } = props;
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);

  return (
    <React.Fragment key={tenant}>
      <TableRow
        hover={true}
        className={classes.tenantRow}
        onClick={() => setOpen(!open)}
      >
        <TableCell className={classes.borderBottom}>
          <Button aria-label="expand limits" size="small">
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            <Typography variant="h6">{tenant}</Typography>
          </Button>
        </TableCell>
        <TableCell
          component="th"
          scope="row"
          className={classes.borderBottom}
        ></TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout={100} unmountOnExit>
            <Box>
              <Table size="small" aria-label="config">
                <TableHead></TableHead>
                <TableBody>
                  {entries(CortexLimitsSchemaDescription).map(
                    ([limitName, schema]) => {
                      const baseValue = baseLimits[limitName];
                      let value = baseValue;

                      if (limitName in limits) {
                        value = limits[limitName];
                      }

                      return (
                        <ConfigRow
                          key={limitName}
                          tenant={tenant}
                          limitName={limitName}
                          baseValue={baseValue}
                          value={value}
                          schema={schema}
                        />
                      );
                    }
                  )}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};
const TenantConfigRowMemoized = React.memo(TenantConfigRow, (prev, next) => {
  return (
    prev.tenant === next.tenant &&
    isEqual(prev.baseLimits, next.baseLimits) &&
    isEqual(prev.limits, next.limits)
  );
});

type ConfigRowProps = {
  tenant: string;
  limitName: CortexLimitsKeys;
  baseValue: string | boolean | number | undefined;
  value: string | boolean | number | undefined;
  schema: CortexLimitsValues;
};

const ConfigRow = ({
  tenant,
  limitName,
  baseValue,
  value,
  schema
}: ConfigRowProps) => {
  const [val, setVal] = useState(value);
  const [error, setError] = useState<null | string>(null);
  const dispatch = useDispatch();
  const theme = useTheme();
  const schemaType = schema.type;
  // .meta Object unfortunately cannot be typed so we have to cast it here
  const description =
    (schema.describe().meta as { description: string }).description! || "-";

  const hasOverride = val !== baseValue;

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      let val: string | boolean | number = event.target.value;

      if (schema.type === "boolean") {
        val = event.target.checked;
      }
      if (schema.type === "number") {
        val = Number(event.target.value.replace(",", ""));
      }
      setVal(val);
      // Run validation
      (async () => {
        try {
          await schema.validate(val);
          setError(null);
          // If new value is same as the baseValue, delete the override, otherwise update the override
          if (val === baseValue) {
            dispatch(
              actions.deleteCortexRuntimeConfig({
                tenant,
                configOption: limitName
              })
            );
          } else {
            dispatch(
              actions.updateCortexRuntimeConfig({
                tenant,
                configOption: limitName,
                value: val
              })
            );
          }
        } catch (err) {
          setError((err as ValidationError).message);
        }
      })();
    },
    [schema, dispatch, tenant, limitName, baseValue]
  );

  return (
    <TableRow key={limitName}>
      <TableCell component="th" scope="row">
        {limitName}{" "}
        <Box component="span" marginLeft={2}>
          <Tooltip
            arrow
            title={<Typography variant="caption">{description}</Typography>}
          >
            <HelpCircle
              color={theme.palette.text.disabled}
              width={17}
              height={17}
            />
          </Tooltip>
        </Box>
      </TableCell>
      <TableCell>
        {schemaType === "boolean" && (
          <Switch
            value={Boolean(val)}
            checked={Boolean(val)}
            onChange={onChange}
          />
        )}
        {schemaType === "string" && (
          <TextField
            value={val}
            error={!!error}
            helperText={error}
            type={schemaType}
            variant="standard"
            onChange={onChange}
          />
        )}
        {schemaType === "number" && (
          <TextField
            value={String(val)}
            error={!!error}
            helperText={error}
            variant="standard"
            onChange={onChange}
            InputProps={{
              inputComponent: ThousandNumberFormat as any
            }}
          />
        )}
      </TableCell>
      <TableCell align="right">
        <Box minWidth={20}>
          <Box hidden={!hasOverride}>
            <Tooltip
              arrow
              title={
                <Typography variant="caption">{`Reset to default (${baseValue})`}</Typography>
              }
            >
              <IconButton
                aria-label="reset limit"
                size="small"
                onClick={() => {
                  setVal(baseValue);
                  dispatch(
                    actions.deleteCortexRuntimeConfig({
                      tenant,
                      configOption: limitName
                    })
                  );
                }}
              >
                <RotateCcw width={15} height={15} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </TableCell>
    </TableRow>
  );
};

const ErrorPanel = ({ message }: { message: string }) => {
  const classes = useStyles();

  return (
    <Box className={classes.errorContainer}>
      <CardHeader titleTypographyProps={{ variant: "h6" }} title="Error" />
      <CardContent>
        {message.split("\n").map(message => (
          <div key={message}>
            {message}
            <br />
          </div>
        ))}
      </CardContent>
    </Box>
  );
};

export default CortexConfig;
