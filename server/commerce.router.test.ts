import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(user: AuthenticatedUser | null = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  process.env.SHOPIFY_STORE_DOMAIN = "test.myshopify.com";
  process.env.SHOPIFY_STOREFRONT_API_ACCESS_TOKEN = "test-token";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function ok(data: unknown) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ data }),
    text: async () => "",
  } as Response);
}

const rawVariant = {
  id: "gid://shopify/ProductVariant/1",
  title: "Default Title",
  availableForSale: true,
  price: { amount: "385.00", currencyCode: "USD" },
  compareAtPrice: null,
  selectedOptions: [{ name: "Title", value: "Default Title" }],
};

const rawProduct = {
  id: "gid://shopify/Product/1",
  title: "Aria",
  handle: "aria",
  description: "",
  descriptionHtml: "",
  productType: "Sculpted",
  vendor: "Maison",
  tags: ["Stoneware"],
  options: [{ name: "Title", values: ["Default Title"] }],
  priceRange: {
    minVariantPrice: { amount: "385.00", currencyCode: "USD" },
    maxVariantPrice: { amount: "385.00", currencyCode: "USD" },
  },
  images: {
    edges: [
      { node: { url: "https://img/1.jpg", altText: null, width: 800, height: 1000 } },
    ],
  },
  variants: { edges: [{ node: rawVariant }] },
};

describe("commerce.products", () => {
  it("normalizes the Storefront response into backend-agnostic Product shapes", async () => {
    ok({ products: { edges: [{ node: rawProduct }] } });

    const caller = appRouter.createCaller(makeCtx());
    const products = await caller.commerce.products.list();

    expect(products).toHaveLength(1);
    const product = products[0];
    expect(product.handle).toBe("aria");
    expect(product.images).toEqual([
      { url: "https://img/1.jpg", altText: null, width: 800, height: 1000 },
    ]);
    expect(product.priceRange.min.amount).toBe("385.00");
    expect(product.variants[0].id).toBe(rawVariant.id);
    expect(product.variants[0].selectedOptions).toEqual([
      { name: "Title", value: "Default Title" },
    ]);

    // The shape must not contain raw GraphQL edges/nodes — that would mean the
    // normalization layer leaked. Stringify and assert.
    const serialized = JSON.stringify(product);
    expect(serialized.includes("edges")).toBe(false);

    // Endpoint should hit the pinned API version.
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/2025-04\/graphql\.json$/);
    expect((init as RequestInit).headers).toMatchObject({
      "X-Shopify-Storefront-Access-Token": "test-token",
    });
  });

  it("maps a missing handle to a NOT_FOUND TRPCError", async () => {
    ok({ productByHandle: null });

    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.commerce.products.byHandle({ handle: "nope" })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("commerce.cart", () => {
  it("creates a cart, normalizes lines, and appends channel=online_store to the checkout URL", async () => {
    ok({
      cartCreate: {
        cart: {
          id: "gid://shopify/Cart/1",
          checkoutUrl: "https://test.myshopify.com/checkout/abc",
          totalQuantity: 2,
          cost: {
            totalAmount: { amount: "770.00", currencyCode: "USD" },
            subtotalAmount: { amount: "770.00", currencyCode: "USD" },
          },
          lines: {
            edges: [
              {
                node: {
                  id: "gid://shopify/CartLine/1",
                  quantity: 2,
                  cost: { totalAmount: { amount: "770.00", currencyCode: "USD" } },
                  merchandise: {
                    id: rawVariant.id,
                    title: "Default Title",
                    price: { amount: "385.00", currencyCode: "USD" },
                    product: {
                      handle: "aria",
                      title: "Aria",
                      images: {
                        edges: [{ node: { url: "https://img/1.jpg", altText: null } }],
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        userErrors: [],
      },
    });

    const caller = appRouter.createCaller(makeCtx());
    const cart = await caller.commerce.cart.create({
      lines: [{ variantId: rawVariant.id, quantity: 2 }],
    });

    expect(cart.id).toBe("gid://shopify/Cart/1");
    expect(cart.itemCount).toBe(2);
    expect(cart.checkoutUrl).toMatch(/\?channel=online_store$/);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({
      lineId: "gid://shopify/CartLine/1",
      variantId: rawVariant.id,
      productHandle: "aria",
      quantity: 2,
    });
  });

  it("maps Shopify userErrors onto a BAD_REQUEST TRPCError", async () => {
    ok({
      cartCreate: {
        cart: null,
        userErrors: [{ message: "merchandise does not exist", field: ["lines"] }],
      },
    });

    const caller = appRouter.createCaller(makeCtx());

    await expect(
      caller.commerce.cart.create({
        lines: [{ variantId: "gid://shopify/ProductVariant/999", quantity: 1 }],
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("merchandise does not exist"),
    });
  });

  it("propagates HTTP failures as INTERNAL_SERVER_ERROR", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({}),
      text: async () => "",
    } as Response);

    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.commerce.products.list()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });
});
