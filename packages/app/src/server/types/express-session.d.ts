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
import "express";
import { Session } from "express-session";
import "http";

declare module "express-session" {
  interface SessionData {
    userId: string;
    email: string;
    username: string;
    avatar: string;
  }
}

declare module "http" {
  interface IncomingMessage {
    session: Session & {
      userId: string;
      email: string;
      username: string;
      avatar: string;
    };
  }
}
