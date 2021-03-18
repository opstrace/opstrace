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

import { useEffect, useMemo } from "react";
import { path } from "ramda";
import { useDispatch, useSelector, State } from "state/provider";
import { createSelector } from "reselect";

import { registerForm, unregisterForm } from "state/form/actions";
import { generateFormId, expandFormId } from "state/form/utils";
import { Form } from "state/form/types";

type formProps = {
  type: string;
  code?: string;
  status?: string;
  data?: object;
  unregisterOnUnmount?: boolean;
};

const useForm = ({
  type,
  code,
  status,
  data,
  unregisterOnUnmount
}: formProps) => {
  const dispatch = useDispatch();
  const id = useMemo(() => generateFormId(type, code), [type, code]);

  useEffect(() => {
    dispatch(registerForm({ id, status, data }));
    return () => {
      if (unregisterOnUnmount === true) dispatch(unregisterForm(id));
    };
  }, [dispatch, id, status, data, unregisterOnUnmount]);

  return id;
};

const selectForm = ({ type, code }: { type: string; code: string }) =>
  createSelector(
    () => type,
    () => code,
    (state: State) => state.form,
    (type, code, formState) => path<Form>([type, code])(formState)?.data
  );

const useFormData = (id: string) => useSelector(selectForm(expandFormId(id)));

export default useForm;
export { useForm, useFormData };
