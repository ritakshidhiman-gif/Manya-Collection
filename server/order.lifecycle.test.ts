import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  markPaymentFailed: vi.fn(),
  markPaymentCaptured: vi.fn(),
  createPendingOrder: vi.fn(),
  getCatalogProductsByIds: vi.fn(),
  updateOrderStatus: vi.fn(),
  listOrders: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, ...mocks };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const context = (role: "admin" | "user" = "admin") => ({
  user: { id: 42, role, email: "test@example.com" },
  req: { protocol: "https", headers: {} },
  res: { cookie: () => undefined, clearCookie: () => undefined },
}) as unknown as TrpcContext;

describe("order lifecycle transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.markPaymentFailed.mockResolvedValue({ orderId: 9 });
    mocks.markPaymentCaptured.mockResolvedValue({ orderId: 9, paymentId: "pay_9" });
    mocks.createPendingOrder.mockResolvedValue({ id: 9, orderNumber: "MC-test", status: "pending_payment" });
    mocks.getCatalogProductsByIds.mockResolvedValue([{ id: 3, name: "Noor Set", price: 2490, color: "Mustard" }]);
    mocks.updateOrderStatus.mockResolvedValue({ id: 9, status: "completed" });
    mocks.listOrders.mockResolvedValue([]);
  });

  it("creates a pending_payment order from server-priced catalog data", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "order_9", amount: 249000, currency: "INR" }) }) as typeof fetch;
    try {
      const result = await appRouter.createCaller(context("user")).checkout.createOrder({ customerName: "Asha Sharma", customerEmail: "asha@example.com", customerPhone: "9876543210", addressLine1: "12 Market Road", city: "Ambala", state: "Haryana", postalCode: "134003", items: [{ productId: 3, quantity: 1, size: "M" }] });
      expect(result.razorpayOrderId).toBe("order_9");
      expect(mocks.createPendingOrder).toHaveBeenCalledWith(expect.objectContaining({ status: "pending_payment", subtotal: 2490 }), expect.any(Array), expect.objectContaining({ providerOrderId: "order_9" }));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("advances a valid payment to processing", async () => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    expect(keySecret).toBeTruthy();
    const razorpayOrderId = "order_9";
    const razorpayPaymentId = "pay_9";
    const signature = createHmac("sha256", keySecret ?? "").update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
    const result = await appRouter.createCaller(context("user")).checkout.verifyPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature: signature });
    expect(result).toMatchObject({ success: true, orderId: 9, paymentId: razorpayPaymentId });
    expect(mocks.markPaymentCaptured).toHaveBeenCalledWith(razorpayOrderId, razorpayPaymentId, signature);
  });

  it("persists a failed Razorpay outcome", async () => {
    const result = await appRouter.createCaller(context("user")).checkout.markFailed({ razorpayOrderId: "order_9", outcome: "failed" });
    expect(result).toEqual({ success: true, orderId: 9 });
    expect(mocks.markPaymentFailed).toHaveBeenCalledWith("order_9", "failed");
  });

  it("allows admins to move an order to completed", async () => {
    const result = await appRouter.createCaller(context()).orders.updateStatus({ orderId: 9, status: "completed" });
    expect(result).toMatchObject({ id: 9, status: "completed" });
    expect(mocks.updateOrderStatus).toHaveBeenCalledWith(9, "completed");
  });

  it("rejects order updates from customers", async () => {
    await expect(appRouter.createCaller(context("user")).orders.updateStatus({ orderId: 9, status: "completed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

