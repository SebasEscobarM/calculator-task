import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renders the calculator, ready at 0", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "Calculator" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Keypad" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("0");
  });
});
