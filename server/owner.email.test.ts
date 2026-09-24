import { describe, expect, it } from "vitest";
import { isOwnerEmail } from "./db";

function normalizeOwnerEmail(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

describe("Manya owner email", () => {
  it("is configured as a valid normalized email", () => {
    const ownerEmail = normalizeOwnerEmail(process.env.OWNER_EMAIL);
    expect(ownerEmail).toBe("ritakshidhiman@gmail.com");
    expect(ownerEmail).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
  });

  it("authorizes only the configured owner email", () => {
    expect(isOwnerEmail("RITAKSHIDHIMAN@GMAIL.COM")).toBe(true);
    expect(isOwnerEmail("customer@example.com")).toBe(false);
    expect(isOwnerEmail(null)).toBe(false);
  });
});
