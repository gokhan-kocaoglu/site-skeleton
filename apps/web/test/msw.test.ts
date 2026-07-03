import { describe, expect, it } from "vitest";

describe("MSW wiring", () => {
  it("intercepts API calls with the default handlers", async () => {
    const response = await fetch("http://localhost:3000/api/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "UP" });
  });
});
