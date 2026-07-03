import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App (sign-in placeholder)", () => {
  it("renders the sign-in form with labelled fields", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: /admin sign-in/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeDisabled();
    expect(screen.getByLabelText(/password/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDisabled();
  });

  it("has no axe-core accessibility violations", async () => {
    const { container } = render(<App />);
    const results = await axe.run(container, {
      // color-contrast needs real layout/paint; jsdom cannot compute it.
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
