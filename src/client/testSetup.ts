import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { i18nReady } from "./i18n/index.js";

// Testing Library only unmounts by itself when the test runner's globals are on.
afterEach(cleanup);

await i18nReady;
