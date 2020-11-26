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

import React, { useState, useEffect } from "react";
import graphqlClient from "state/graphqlClient";
import useCurrentUser, {
  useCurrentUserLoaded
} from "state/user/hooks/useCurrentUser";
/**
 * withAccess wraps a component to ensure the component
 * is only mounted if access has been granted.
 * @param render function to be called when access granted
 * @param fallback functin to be called when access denied
 */
export default function WithAuthentication(props: {
  onFailure: React.ReactNode;
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState(true);
  const [granted, setGranted] = useState(false);
  const currentUser = useCurrentUser();
  const currentUserLoaded = useCurrentUserLoaded();

  useEffect(() => {
    let unmounted = false;

    if (currentUser.email) {
      setGranted(true);
      setPending(false);
      return;
    }
    if (!currentUserLoaded) {
      (async function checkHasAccess() {
        try {
          await graphqlClient.GetCurrentUser();
          !unmounted && setGranted(true);
        } catch (e) {
          !unmounted && setGranted(false);
        } finally {
          !unmounted && setPending(false);
        }
      })();
    }
    if (!currentUser.email && currentUserLoaded) {
      setGranted(false);
      setPending(false);
    }
    return () => { unmounted = true; }
  }, [currentUser, currentUserLoaded]);

  if (pending) {
    return null;
  }
  if (granted) {
    return <>{props.children}</>;
  }
  return <>{props.onFailure}</>;
}
