import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "../app/page";

describe("HomePage", () => {
  it("renders exactly one h1", () => {
    render(<HomePage />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Site Skeleton");
  });

  it("renders the stack overview section", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { level: 2, name: /what's inside/i }),
    ).toBeInTheDocument();
  });

  it("renders a last-updated time element with a valid ISO date and visible label", () => {
    render(<HomePage />);
    const timeElement = screen.getByText(/son güncelleme:/i).querySelector("time");
    expect(timeElement).not.toBeNull();
    expect(timeElement).toHaveAttribute("datetime", expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });
});
