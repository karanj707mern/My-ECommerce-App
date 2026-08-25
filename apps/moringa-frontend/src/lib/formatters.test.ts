import { describe, expect, it } from "vitest";
import {
  formatMediumDate,
  formatMediumDateTime,
  formatRupees,
  normalizePrice,
  renderStars,
} from "./formatters";

describe("formatRupees", () => {
  it("formats whole rupee amounts in en-IN grouping", () => {
    expect(formatRupees(1234)).toBe("₹1,234");
    expect(formatRupees(1234567)).toBe("₹12,34,567");
  });

  it("truncates fractional digits (maximumFractionDigits: 0)", () => {
    expect(formatRupees(99.9)).toMatch(/^₹(?:99|100)$/);
  });

  it("coerces numeric strings", () => {
    expect(formatRupees("500")).toBe("₹500");
  });

  it("falls back to ₹0 for null/undefined/non-numeric", () => {
    expect(formatRupees(null)).toBe("₹0");
    expect(formatRupees(undefined)).toBe("₹0");
    expect(formatRupees("not-a-number")).toBe("₹0");
  });
});

describe("normalizePrice", () => {
  it("passes through finite numbers", () => {
    expect(normalizePrice(42)).toBe(42);
    expect(normalizePrice("19.5")).toBe(19.5);
  });

  it("maps invalid input to 0", () => {
    expect(normalizePrice("abc")).toBe(0);
    expect(normalizePrice(undefined)).toBe(0);
    expect(normalizePrice(Number.NaN)).toBe(0);
  });
});

describe("renderStars", () => {
  it("renders filled and hollow stars for a rating", () => {
    expect(renderStars(5)).toBe("★★★★★");
    expect(renderStars(3)).toBe("★★★☆☆");
    expect(renderStars(0)).toBe("☆☆☆☆☆");
  });

  it("clamps ratings above 5 to a full house", () => {
    expect(renderStars(99)).toBe("★★★★★");
  });

  it("treats negative ratings as zero", () => {
    expect(renderStars(-3)).toBe("☆☆☆☆☆");
  });

  it("always emits exactly five glyphs for fractional ratings", () => {
    // index < 2.5 is true for indices 0,1,2 -> 3 filled stars.
    expect(renderStars(2.5)).toHaveLength(5);
    expect(renderStars(2.5)).toBe("★★★☆☆");
  });
});

describe("formatMediumDate", () => {
  it("formats ISO dates in en-IN medium style", () => {
    const out = formatMediumDate("2026-01-05");
    expect(out).toMatch(/Jan/);
    expect(out).toContain("2026");
  });

  it("never throws on garbage input (epoch fallback)", () => {
    expect(typeof formatMediumDate("garbage")).toBe("string");
  });

  it("accepts a Date instance", () => {
    const out = formatMediumDate(new Date("2026-06-15T00:00:00Z"));
    expect(out).toContain("2026");
    expect(out).toMatch(/Jun/);
  });

  it("accepts a unix epoch milliseconds number", () => {
    const out = formatMediumDate(1767225600000);
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(0);
  });

  it("falls back to epoch for null/undefined", () => {
    expect(typeof formatMediumDate(null)).toBe("string");
    expect(typeof formatMediumDate(undefined)).toBe("string");
  });
});

describe("formatMediumDateTime", () => {
  it("includes both date and time components", () => {
    const out = formatMediumDateTime("2026-01-05T13:45:00");
    expect(out).toContain("2026");
    expect(out).toMatch(/Jan/);
    // Time portion present (hh:mm).
    expect(out).toMatch(/\d{1,2}:\d{2}/);
  });

  it("never throws on garbage input", () => {
    expect(typeof formatMediumDateTime("not-a-date")).toBe("string");
  });
});

describe("formatRupees — extended edge cases", () => {
  it("formats zero", () => {
    expect(formatRupees(0)).toBe("₹0");
  });

  it("formats negative amounts", () => {
    expect(formatRupees(-500)).toBe("-₹500");
  });

  it("handles very large amounts with Indian grouping", () => {
    expect(formatRupees(123456789)).toBe("₹12,34,56,789");
  });

  it("treats NaN as zero", () => {
    expect(formatRupees(Number.NaN)).toBe("₹0");
  });

  it("treats Infinity as zero", () => {
    expect(formatRupees(Infinity)).toBe("₹0");
  });
});

describe("normalizePrice — extended edge cases", () => {
  it("parses whole-number strings", () => {
    expect(normalizePrice("100")).toBe(100);
  });

  it("parses negative numbers", () => {
    expect(normalizePrice("-5")).toBe(-5);
  });

  it("maps empty string to 0", () => {
    expect(normalizePrice("")).toBe(0);
  });

  it("maps whitespace-only string to 0", () => {
    expect(normalizePrice("   ")).toBe(0);
  });
});
