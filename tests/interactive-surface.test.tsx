/** @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import InteractiveSurface from "@/components/ui/InteractiveSurface";

describe("InteractiveSurface", () => {
  it.each(["card", "stage", "row"] as const)(
    "uses the same gold hover and focus contract for %s",
    (variant) => {
      render(
        <InteractiveSurface
          variant={variant}
          onClick={vi.fn()}
          aria-label={`${variant}-surface`}
        >
          {variant}
        </InteractiveSurface>,
      );

      const button = screen.getByRole("button", {
        name: `${variant}-surface`,
      });

      expect(button).toHaveClass("hover:border-[#D9AD55]/50");
      expect(button).toHaveClass("hover:bg-[#EDC66D]/5");
      expect(button).toHaveClass("focus-visible:ring-[#D9AD55]");
    },
  );
});
