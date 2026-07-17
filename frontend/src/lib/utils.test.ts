import { describe, expect, it } from "vitest";

import { formatTokenAmount, parseTokenAmount, truncateAddress } from "./utils";

describe("formatTokenAmount", () => {
  it("formats a whole-number stroop amount", () => {
    expect(formatTokenAmount(1000_0000000n)).toBe("1000");
  });

  it("strips trailing zeros from the fractional part", () => {
    expect(formatTokenAmount(1_5000000n)).toBe("1.5");
  });

  it("keeps significant fractional digits", () => {
    expect(formatTokenAmount(1_0000001n)).toBe("1.0000001");
  });

  it("handles zero", () => {
    expect(formatTokenAmount(0n)).toBe("0");
  });

  it("handles negative amounts (e.g. arrears display)", () => {
    expect(formatTokenAmount(-2_5000000n)).toBe("-2.5");
  });

  it("accepts plain numbers, not just bigint", () => {
    expect(formatTokenAmount(1_0000000)).toBe("1");
  });
});

describe("parseTokenAmount", () => {
  it("parses a whole number into stroops", () => {
    expect(parseTokenAmount("100")).toBe(100_0000000n);
  });

  it("parses a decimal into stroops", () => {
    expect(parseTokenAmount("1.5")).toBe(1_5000000n);
  });

  it("pads short fractional input", () => {
    expect(parseTokenAmount("1.1")).toBe(1_1000000n);
  });

  it("truncates fractional input beyond 7dp rather than rounding", () => {
    expect(parseTokenAmount("1.123456789")).toBe(1_1234567n);
  });

  it("treats empty input as zero", () => {
    expect(parseTokenAmount("")).toBe(0n);
  });

  it("round-trips with formatTokenAmount", () => {
    const stroops = parseTokenAmount("42.5");
    expect(formatTokenAmount(stroops)).toBe("42.5");
  });
});

describe("truncateAddress", () => {
  const address = "GB4KHIMYVOYSIU7B4WMHJF73I4TXPJHNQF7KUHNNW4RZLGPCXJVRCC3C";

  it("shortens a long address to head...tail", () => {
    expect(truncateAddress(address)).toBe("GB4K...CC3C");
  });

  it("respects a custom character count", () => {
    expect(truncateAddress(address, 6)).toBe("GB4KHI...VRCC3C");
  });

  it("leaves short strings untouched", () => {
    expect(truncateAddress("short")).toBe("short");
  });
});
