import { describe, expect, it } from "vitest";
import { orderStatusSchema } from "./routers";

describe("order lifecycle status", () => {
  it("accepts the supported storefront lifecycle states", () => {
    expect(["pending_payment", "processing", "completed", "failed", "cancelled"].map((status) => orderStatusSchema.parse(status))).toEqual([
      "pending_payment",
      "processing",
      "completed",
      "failed",
      "cancelled",
    ]);
  });

  it("rejects unknown payment-style states", () => {
    expect(() => orderStatusSchema.parse("pending")).toThrow();
  });
});

