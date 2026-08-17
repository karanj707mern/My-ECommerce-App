import React from "react";
import { render } from "@testing-library/react";
import Header from "@/components/Header";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/",
}));

describe("Header", () => {
  it("should render the header section", () => {
    const { container } = render(<Header />);
    expect(container.querySelector("section")).toBeDefined();
  });
});
