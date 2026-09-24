/**
 * tsx runner for `pnpm shopify:probe`.
 *
 * Prints normalized output of `listProducts()` against the real Storefront
 * API and exits non-zero if the catalog isn't usable for rendering.
 *
 * Wire it into `package.json` after dropping the bundle in:
 *   "shopify:probe": "tsx scripts/shopify-probe.runner.ts"
 */

import { isShopifyConfigured, listProducts } from "../server/_core/shopify";

async function main() {
  if (!isShopifyConfigured()) {
    console.error(
      "[shopify:probe] SHOPIFY_STORE_DOMAIN or SHOPIFY_STOREFRONT_API_ACCESS_TOKEN is not set."
    );
    process.exit(2);
  }

  console.log("[shopify:probe] calling listProducts({ first: 25 })...");
  const products = await listProducts({ first: 25 });
  console.log(`[shopify:probe] received ${products.length} product(s).\n`);

  const preview = products.map(p => ({
    handle: p.handle,
    title: p.title,
    productType: p.productType,
    price: `${p.priceRange.min.amount} ${p.priceRange.min.currencyCode}`,
    image: p.images[0]?.url ?? null,
    variantCount: p.variants.length,
    firstVariantAvailable: p.variants[0]?.availableForSale ?? false,
  }));
  console.log(JSON.stringify(preview, null, 2));

  const usable = products.find(p => {
    const hasTitle = typeof p.title === "string" && p.title.trim().length > 0;
    const hasImage = (p.images[0]?.url ?? "").length > 0;
    const priceNum = Number.parseFloat(p.priceRange.min.amount);
    const hasPrice = Number.isFinite(priceNum) && priceNum > 0;
    return hasTitle && hasImage && hasPrice;
  });

  if (!usable) {
    console.error(
      "\n[shopify:probe] FAIL: no product had all of title + image + price > 0."
    );
    console.error(
      "  Likely causes: products not published to the Manus channel, missing price, or missing media."
    );
    process.exit(1);
  }

  console.log(
    `\n[shopify:probe] OK: "${usable.title}" has title + image + price > 0.`
  );
}

main().catch(err => {
  console.error("[shopify:probe] ERROR:", err);
  process.exit(1);
});
