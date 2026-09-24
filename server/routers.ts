import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { createCatalogProduct, createEmailOtpChallenge, consumeEmailOtpChallenge, createPendingOrder, deleteCatalogProduct, getCatalogProductsByIds, getLatestEmailOtpChallenge, incrementEmailOtpAttempts, listCatalogProducts, listOrders, markPaymentCaptured, markPaymentFailed, updateOrderStatus, upsertUser } from "./db";
import { sdk } from "./_core/sdk";
import { commerceRouter } from "./routers/commerce";
import { storagePut } from "./storage";

export const orderStatusSchema = z.enum(["pending_payment", "processing", "completed", "failed", "cancelled"]);

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  // Retained for the injected compatibility context; Manya storefront checkout uses checkout.* below.
  commerce: commerceRouter,
  checkout: router({
    createOrder: publicProcedure
      .input(z.object({
        customerName: z.string().trim().min(2).max(160),
        customerEmail: z.string().trim().toLowerCase().email().max(320),
        customerPhone: z.string().trim().min(7).max(32).optional(),
        addressLine1: z.string().trim().min(3).max(240),
        addressLine2: z.string().trim().max(240).optional(),
        city: z.string().trim().min(2).max(120),
        state: z.string().trim().min(2).max(120),
        postalCode: z.string().trim().min(3).max(20),
        items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(10), size: z.string().max(20).optional() })).min(1).max(30),
      }))
      .mutation(async ({ input, ctx }) => {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keyId || !keySecret) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Payments are not configured yet." });

        const productIds = Array.from(new Set(input.items.map((item) => item.productId)));
        const products = await getCatalogProductsByIds(productIds);
        const productById = new Map(products.map((product) => [product.id, product]));
        const orderItemsInput = input.items.map((item) => {
          const product = productById.get(item.productId);
          if (!product) throw new TRPCError({ code: "BAD_REQUEST", message: "One of the selected designs is no longer available." });
          return { productId: product.id, productName: product.name, quantity: item.quantity, unitPrice: product.price, size: item.size, color: product.color };
        });
        const subtotal = orderItemsInput.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        const orderNumber = `MC-${Date.now()}-${randomInt(1000, 10000)}`;
        const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`, "Content-Type": "application/json" },
          body: JSON.stringify({ amount: subtotal * 100, currency: "INR", receipt: orderNumber, notes: { brand: "Manya Collection", customerEmail: input.customerEmail } }),
        });
        const razorpayOrder = await razorpayResponse.json() as { id?: string; amount?: number; currency?: string; error?: { description?: string } };
        if (!razorpayResponse.ok || !razorpayOrder.id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: razorpayOrder.error?.description || "Unable to start payment. Please try again." });

        await createPendingOrder({ orderNumber, userId: ctx.user?.id, customerName: input.customerName, customerEmail: input.customerEmail, customerPhone: input.customerPhone, addressLine1: input.addressLine1, addressLine2: input.addressLine2, city: input.city, state: input.state, postalCode: input.postalCode, subtotal, total: subtotal, currency: "INR", status: "pending_payment" }, orderItemsInput, { provider: "razorpay", providerOrderId: razorpayOrder.id, amount: razorpayOrder.amount ?? subtotal * 100, currency: "INR", status: "created" });
        return { keyId, razorpayOrderId: razorpayOrder.id, amount: razorpayOrder.amount ?? subtotal * 100, currency: razorpayOrder.currency ?? "INR", orderNumber };
      }),
    verifyPayment: publicProcedure
      .input(z.object({ razorpayOrderId: z.string().min(1), razorpayPaymentId: z.string().min(1), razorpaySignature: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET ?? "").update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`).digest("hex");
        const expectedBuffer = Buffer.from(expected, "hex");
        const receivedBuffer = Buffer.from(input.razorpaySignature, "hex");
        if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) throw new TRPCError({ code: "BAD_REQUEST", message: "Payment verification failed. No order was marked as paid." });
        const result = await markPaymentCaptured(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature);
        if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Payment record was not found." });
        return { success: true as const, orderId: result.orderId, paymentId: result.paymentId };
      }),
    markFailed: publicProcedure
      .input(z.object({ razorpayOrderId: z.string().min(1), outcome: z.enum(["failed", "cancelled"]) }))
      .mutation(async ({ input }) => {
        const result = await markPaymentFailed(input.razorpayOrderId, input.outcome);
        if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Payment record was not found." });
        return { success: true as const, orderId: result.orderId };
      }),
  }),

  orders: router({
    list: adminProcedure.query(() => listOrders()),
    updateStatus: adminProcedure
      .input(z.object({ orderId: z.number().int().positive(), status: orderStatusSchema }))
      .mutation(({ input }) => updateOrderStatus(input.orderId, input.status)),
  }),

  catalog: router({
    list: publicProcedure.query(async () => {
      const rows = await listCatalogProducts();
      return rows.map((row) => ({
        ...row,
        id: String(row.id),
        sizes: JSON.parse(row.sizes) as string[],
      }));
    }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(180),
        category: z.enum(["Cotton", "Festive", "Designer", "Winter"]),
        gender: z.enum(["Women", "Unisex"]),
        color: z.string().min(1).max(80),
        price: z.number().int().nonnegative(),
        sizes: z.array(z.string().min(1)).min(1),
        image: z.string().url(),
        badge: z.string().max(80).optional(),
        description: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const slugBase = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const row = await createCatalogProduct({
          slug: `${slugBase}-${Date.now()}`,
          name: input.name,
          category: input.category,
          gender: input.gender,
          color: input.color,
          price: input.price,
          sizes: JSON.stringify(input.sizes),
          image: input.image,
          badge: input.badge,
          description: input.description,
        });
        if (!row) throw new Error("Catalog product was not created");
        return { ...row, id: String(row.id), sizes: JSON.parse(row.sizes) as string[] };
      }),
    uploadImage: adminProcedure
      .input(z.object({
        fileName: z.string().trim().min(1).max(160),
        contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]),
        dataBase64: z.string().min(100).max(11_000_000),
      }))
      .mutation(async ({ input, ctx }) => {
        const safeName = input.fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
        const buffer = Buffer.from(input.dataBase64, "base64");
        if (buffer.length > 8 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Please choose an image smaller than 8 MB." });
        const uploaded = await storagePut(`manya-catalog/${ctx.user.id}/${Date.now()}-${safeName}`, buffer, input.contentType);
        return uploaded;
      }),
    remove: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => deleteCatalogProduct(input.id)),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    requestEmailOtp: publicProcedure
      .input(z.object({ name: z.string().trim().min(2).max(160), email: z.string().trim().toLowerCase().email().max(320) }))
      .mutation(async ({ input }) => {
        const apiKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.RESEND_FROM_EMAIL;
        if (!apiKey || !fromEmail) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Email sign-in is not configured yet." });

        const code = randomInt(100000, 1000000).toString();
        const codeHash = createHash("sha256").update(code).digest("hex");
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await createEmailOtpChallenge({ email: input.email, name: input.name, codeHash, expiresAt, attempts: 0 });

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: fromEmail,
            to: [input.email],
            subject: "Your Manya Collection verification code",
            html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1f2937"><p style="letter-spacing:.12em;text-transform:uppercase;font-size:11px;color:#a27a2a">Manya Collection</p><h1 style="font-size:28px;margin:24px 0 12px">Your verification code</h1><p>Hi ${input.name.replace(/[&<>\"']/g, "")}, use this code to continue signing in:</p><p style="font-size:34px;letter-spacing:.3em;font-weight:700;margin:28px 0">${code}</p><p style="color:#6b7280">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p></div>`,
          }),
        });
        if (!response.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "We could not send the verification email. Please try again." });
        return { success: true as const, email: input.email, expiresInSeconds: 600 };
      }),
    verifyEmailOtp: publicProcedure
      .input(z.object({ email: z.string().trim().toLowerCase().email().max(320), code: z.string().regex(/^\d{6}$/) }))
      .mutation(async ({ input, ctx }) => {
        const challenge = await getLatestEmailOtpChallenge(input.email);
        if (!challenge || challenge.expiresAt.getTime() < Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "That code has expired. Please request a new one." });
        if (challenge.attempts >= 5) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many incorrect attempts. Please request a new code." });

        const expected = Buffer.from(challenge.codeHash, "hex");
        const actual = Buffer.from(createHash("sha256").update(input.code).digest("hex"), "hex");
        if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
          await incrementEmailOtpAttempts(challenge.id);
          throw new TRPCError({ code: "BAD_REQUEST", message: "That code is not correct." });
        }

        const openId = `email:${createHash("sha256").update(input.email).digest("hex").slice(0, 56)}`;
        await upsertUser({ openId, name: challenge.name, email: input.email, loginMethod: "email-otp", lastSignedIn: new Date() });
        const sessionToken = await sdk.createSessionToken(openId, { name: challenge.name, expiresInMs: ONE_YEAR_MS });
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
        await consumeEmailOtpChallenge(challenge.id);
        return { success: true as const };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
