import React from "react";
import { render } from "@testing-library/react";
import Footer from "@/components/Footer";
import { ToastProvider } from "@/components/ToastProvider";

describe("Footer", () => {
  it("should render the footer", () => {
    const { container } = render(
      <ToastProvider>
        <Footer />
      </ToastProvider>,
    );
    expect(container.querySelector("footer")).toBeDefined();
  });
});
