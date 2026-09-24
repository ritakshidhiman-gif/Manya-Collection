import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("checkout payment verification", () => {
  it("rejects an invalid Razorpay signature", async () => {
    const ctx = {
      user: undefined,
      req: { protocol: "https", headers: {} },
      res: { cookie: () => undefined, clearCookie: () => undefined },
    } as unknown as TrpcContext;
    const caller = appRouter.createCaller(ctx);

    await expect(caller.checkout.verifyPayment({
      razorpayOrderId: "order_test",
      razorpayPaymentId: "pay_test",
      razorpaySignature: "00",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
