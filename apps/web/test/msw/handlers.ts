import { http, HttpResponse } from "msw";

/**
 * Default API mocks for component tests. Extend per feature; tests can
 * override with `server.use(...)`. Unhandled requests fail the test
 * (see test/setup.ts) so silent real-network calls cannot slip in.
 */
export const handlers = [
  http.get("*/api/health", () => HttpResponse.json({ status: "UP" })),
];
