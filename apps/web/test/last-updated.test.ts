import { describe, expect, it } from "vitest";
import { getLastUpdated } from "../lib/last-updated";

describe("getLastUpdated", () => {
  it("formats a given UTC date into an ISO day string and a tr-TR long display string", () => {
    // Arrange
    const date = new Date("2026-07-03T00:00:00Z");
    // Act
    const result = getLastUpdated(date);
    // Assert
    expect(result.iso).toBe("2026-07-03");
    expect(result.display).toBe("3 Temmuz 2026");
  });

  it("zero-pads single-digit month and day in the iso string", () => {
    // Arrange
    const date = new Date("2026-01-05T00:00:00Z");
    // Act
    const result = getLastUpdated(date);
    // Assert
    expect(result.iso).toBe("2026-01-05");
    expect(result.display).toBe("5 Ocak 2026");
  });

  it("defaults to the current date when no argument is provided", () => {
    // Arrange
    // Act
    const result = getLastUpdated();
    // Assert
    expect(result.iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
