import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import Home from "./page";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("Home page", () => {
  it("renders the app name", async () => {
    render(await Home());
    expect(
      screen.getByRole("heading", { name: /heading/i }),
    ).toBeInTheDocument();
  });
});
