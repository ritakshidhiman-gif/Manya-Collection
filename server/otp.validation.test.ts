import { describe, expect, it } from "vitest";
import { z } from "zod";

const sixDigitCode = z.string().regex(/^\d{6}$/);

describe("email OTP validation", () => {
  it("accepts a valid six-digit numeric code", () => {
    expect(sixDigitCode.parse("231297")).toBe("231297");
  });

  it("rejects malformed codes", () => {
    expect(() => sixDigitCode.parse("23129")).toThrow();
    expect(() => sixDigitCode.parse("23a297")).toThrow();
  });
});
