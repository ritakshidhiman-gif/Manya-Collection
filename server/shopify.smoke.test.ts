/**
 * Live smoke test for the Shopify Storefront integration.
 *
 * Goal: prove the store actually returns at least one usable product with
 * the three things a storefront needs to render — a title, an image, and a
 * non-zero price. If this passes, the homepage and PDP will work; if it
 * fails, there's an integration / catalog issue, not a UI bug.
 *
 * Behavior:
 *   - Calls the real Storefront API via `listProducts()` (no mocking).
 *   - Auto-skips when `SHOPIFY_STORE_DOMAIN` and the storefront token aren't
 *     configured, so CI environments without credentials stay green.
 *   - Logs the first 3 normalized products so the agent can see the actual
 *     output (titles, prices, image URLs) without reaching for `curl`.
 *
 * For a more verbose, standalone version see `scripts/shopify-probe.mjs`.
 */

import { describe, expect, it } from "vitest";
import { isShopifyConfigured, listProducts } from "./_core/shopify";

const configured = isShopifyConfigured() && process.env.SHOPIFY_CHECKOUT_ENABLED === "true";

describe.skipIf(!configured)("shopify smoke (live)", () => {
  it(
    "returns at least one product with title, image, and non-zero price",
    { timeout: 30_000 },
    async () => {
    const products = await listProducts({ first: 10 });

    // Print a compact view so the agent can see the actual normalized output
    // (titles, prices, image URLs) directly in test logs.
    const preview = products.slice(0, 3).map(p => ({
      handle: p.handle,
      title: p.title,
      price: `${p.priceRange.min.amount} ${p.priceRange.min.currencyCode}`,
      firstImage: p.images[0]?.url ?? null,
      variantCount: p.variants.length,
    }));
    // eslint-disable-next-line no-console
    console.log("[shopify smoke] products:", JSON.stringify(preview, null, 2));

    expect(products.length).toBeGreaterThanOrEqual(1);

    const usable = products.find(p => {
      const hasTitle = typeof p.title === "string" && p.title.trim().length > 0;
      const hasImage = (p.images[0]?.url ?? "").length > 0;
      const priceNum = Number.parseFloat(p.priceRange.min.amount);
      const hasPrice = Number.isFinite(priceNum) && priceNum > 0;
      return hasTitle && hasImage && hasPrice;
    });

      expect(
        usable,
        "No product had all three of: title, first image URL, and price > 0"
      ).toBeTruthy();
    }
  );
});

// Shopify is intentionally disabled for Manya's custom Razorpay checkout.
// Set SHOPIFY_CHECKOUT_ENABLED=true only if the project is switched back to Shopify.
describe.skipIf(configured)("shopify smoke (skipped)", () => {
  it("is skipped because SHOPIFY_STORE_DOMAIN / SHOPIFY_STOREFRONT_API_ACCESS_TOKEN are not set", () => {
    expect(true).toBe(true);
  });
});
