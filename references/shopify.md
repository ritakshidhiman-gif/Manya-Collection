# Shopify Integration

## Overview

Shopify integration uses two layers:
- **MCP tools** (`shopify_create_product`, `shopify_get_products`, etc.) — for all store setup: creating products, setting prices, uploading images, publishing to sales channels. Do NOT use `curl` or write Admin API code in the app.
- **Storefront API** — the only API used in deployed application code. **You do not write this yourself.** When `webdev_add_feature shopify` is called, a reusable scaffold is injected into the project that already exposes the Storefront API through tRPC. Available in both dev and production via `process.env.SHOPIFY_STOREFRONT_API_ACCESS_TOKEN`.

The injected scaffold consists of:
- `server/_core/shopify.ts` — `storefrontFetch`, GraphQL fragments, and the capability functions: `listProducts`, `getProductByHandle`, `listCollections`, `getCollectionByHandle`, `createCart`, `getCart`, `addCartLines`, `updateCartLines`, `removeCartLines`.
- `server/_core/shopifyNormalize.ts` — the decoupling seam. Raw Shopify shapes are private to this file; every function above returns backend-agnostic commerce types.
- `server/routers/commerce.ts` — thin tRPC router exposing `commerce.products.*`, `commerce.collections.*`, `commerce.cart.*`. Mounted in `server/routers.ts`.
- `shared/commerce/types.ts` — `Money`, `Image`, `Product`, `ProductVariant`, `ProductOption`, `Collection`, `Cart`, `CartItem`. **The frontend imports commerce types only from here.**
- `client/src/contexts/CartContext.tsx` — provides the `useCart()` hook used by every storefront UI.
- `server/shopify.smoke.test.ts` — live Storefront smoke test that runs under `pnpm test`.
- `scripts/shopify-probe.runner.ts` + `pnpm shopify:probe` — standalone probe that prints normalized catalog output for ad-hoc inspection.

The frontend never sees Shopify shapes, GraphQL `edges/nodes`, or storefront tokens. UI work talks to `trpc.commerce.*` and types from `@shared/commerce/types`, nothing else.

---

## Scaffold Reference (the only API you call)

### Commerce types — `@shared/commerce/types`

```ts
type Money = { amount: string; currencyCode: string };
type Image = { url: string; altText: string | null; width?: number; height?: number };

type ProductVariant = {
  id: string;
  title: string;                 // "Default Title" for single-variant products — SUPPRESS in UI
  availableForSale: boolean;
  price: Money;
  compareAtPrice: Money | null;
  selectedOptions: { name: string; value: string }[];
};

type Product = {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  productType: string;
  vendor: string;
  tags: string[];                // recommended dimension for client-side filtering
  options: { name: string; values: string[] }[];
  priceRange: { min: Money; max: Money };
  images: Image[];               // flat array, no edges
  variants: ProductVariant[];
};

type CartItem = {
  lineId: string;
  variantId: string;
  productHandle: string;
  productTitle: string;
  variantTitle: string;          // suppress display when === "Default Title"
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  image: Image | null;
};

type Cart = {
  id: string;
  checkoutUrl: string;           // already has ?channel=online_store appended by the scaffold
  itemCount: number;
  subtotal: Money;
  total: Money;
  items: CartItem[];
};

type Collection = {
  id: string;
  handle: string;
  title: string;
  description: string;
  image: Image | null;
};
```

**Conventions baked into the normalized shape:**
- `variantTitle === "Default Title"` for any product with one variant — suppress the string in your UI.
- `Product.tags` is the recommended dimension for client-side filtering (e.g. "Pastel", "Whimsical"). Use `collectionHandle` for server-side filtering.
- `cart.checkoutUrl` is final — do **not** append `?channel=online_store` on the frontend; the scaffold already did.
- `Product.images` and `Cart.items` are flat arrays. Never reach for `.edges`/`.node` in feature code.

### `commerce.*` tRPC procedures (exact names and inputs)

| Procedure | Kind | Input | Returns |
|---|---|---|---|
| `commerce.products.list` | query | `{ first?: number; collectionHandle?: string }` (all optional) | `Product[]` |
| `commerce.products.byHandle` | query | `{ handle: string }` | `Product` (throws `NOT_FOUND`) |
| `commerce.collections.list` | query | `{ first?: number }` | `Collection[]` |
| `commerce.collections.byHandle` | query | `{ handle: string }` | `Collection` |
| `commerce.cart.create` | mutation | `{ lines: [{ variantId, quantity }] }` | `Cart` |
| `commerce.cart.get` | query | `{ cartId }` | `Cart | null` |
| `commerce.cart.addLines` | mutation | `{ cartId, lines: [{ variantId, quantity }] }` | `Cart` |
| `commerce.cart.updateLines` | mutation | `{ cartId, lines: [{ lineId, quantity }] }` | `Cart` (qty 0 ⇒ removes the line) |
| `commerce.cart.removeLines` | mutation | `{ cartId, lineIds: string[] }` | `Cart` |

### `useCart()` — the hook the scaffold ships

```ts
const {
  cart, isOpen, loading, itemCount,
  openCart, closeCart,
  addItem,         // (variantId, quantity = 1) => Promise<void>   — opens the drawer on success
  updateQuantity,  // (lineId, quantity)        => Promise<void>   — qty 0 removes the line
  removeItem,      // (lineId)                  => Promise<void>
  clearCart,
  proceedToCheckout, // opens cart.checkoutUrl in a new tab
} = useCart();
```

The provider persists `cart.id` in `localStorage` under `"commerce:cart-id"` and rehydrates on mount. You don't need to wire any of that yourself.

---

## Zero-to-Live Storefront Runbook

### Step 1 — Seed Products

Call `shopify_create_product` per product with `publish: true` and `status: "ACTIVE"` so the product is created, priced, imaged, and published to the Manus channel in a single tool call.

**Seeding rule — STRICT:**

> Seed **exactly 1–2 products** (with no variants) unless the user has explicitly named more, or has explicitly asked you to seed "enough to demonstrate X." This rule binds even when the user's feature list (filtering, multiple categories, related-product carousels) would visually look better with more products. **A sparsely populated filter is not a justification to add products** — build the UI so it handles 1–2 items gracefully (e.g. avoid prominent filter bars on the home page when seeding is small).
>
> If you genuinely believe more products are needed to test a feature, **ask the user before seeding** rather than deciding unilaterally. Sequential MCP creates have a real time cost and seed data is rarely what the user actually wants in production.

Other notes on `shopify_create_product`:
- `publish: true` requires `status: "ACTIVE"` — the call errors otherwise.
- It creates a **single default variant** (`variantTitle === "Default Title"`). For multiple priced size/color variants, create the product first, then add the remaining variants with `shopify_create_product_variants` (or `productOptionsCreate` + `shopify_create_product_variants` for new option dimensions).
- For `media_urls`, first upload each image with `manus-upload-file` (NOT `--webdev`) to get a public CDN URL, then pass those URLs. Shopify processes images asynchronously; allow a few seconds before verifying — but do **not** block UI work waiting for them.

### Step 2 — Verify the catalog is live

Before writing UI on top of the catalog, prove the Storefront API actually returns usable products through the injected scaffold:

```bash
pnpm shopify:probe
```

The probe calls `listProducts({ first: 25 })` against the real Storefront API and prints the normalized output (handle, title, price, image URL, variant count) for every product. It exits non-zero if no product has all of `title + image + price > 0`. If it fails, stop and fix the catalog before touching UI — almost every failure mode at this step is a Step 1 problem (not published to the Manus channel, missing price, missing media).

The same assertion runs under `pnpm test` as `server/shopify.smoke.test.ts`. It auto-skips when `SHOPIFY_STORE_DOMAIN` and the storefront token aren't configured, so CI without creds stays green.

### Step 3 — Write Application Code

You DO NOT write Storefront API code. The scaffold already exposes everything the storefront needs through tRPC. UI work consists of:

1. Calling `trpc.commerce.*` from React components (typed end-to-end).
2. Importing data shapes from `@shared/commerce/types` (never from `server/_core/shopify.ts`).
3. Using `useCart()` from the shipped `CartContext` provider.

If a procedure you need isn't on the router yet, add it as a thin wrapper in `server/routers/commerce.ts` that calls into a function exported from `server/_core/shopify.ts`. **Do not write raw GraphQL queries in feature code.** Do not call `fetch(...)` against Shopify from feature code.

---

## Frontend Patterns

### Product list page

```tsx
import { trpc } from "@/lib/trpc";

export function Shop() {
  const { data: products = [], isLoading } = trpc.commerce.products.list.useQuery();
  // products is Product[] — flat, no edges
  // Filter client-side on Product.tags or Product.productType.
}
```

### Product detail page (PDP) — type props with `Product`, not `useQuery` inference

```tsx
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import type { Product } from "@shared/commerce/types";

function ProductView({ product }: { product: Product }) {
  // Use the shared type, not ReturnType<typeof useQuery>["data"].
  const { addItem, loading } = useCart();
  const variant = product.variants[0]; // or selected variant for multi-variant products
  return (
    <button disabled={!variant.availableForSale || loading}
            onClick={() => addItem(variant.id, 1)}>
      Add to basket
    </button>
  );
}

export function ProductDetail({ handle }: { handle: string }) {
  const { data: product, isLoading } = trpc.commerce.products.byHandle.useQuery(
    { handle },
    { enabled: Boolean(handle) }
  );
  if (isLoading) return <Skeleton />;
  if (!product) return <NotFound />;
  return <ProductView product={product} />;
}
```

### Cart drawer / checkout

```tsx
const { cart, items, itemCount, updateQuantity, removeItem, proceedToCheckout } = useCart();

// In your "Checkout" button:
<button onClick={proceedToCheckout} disabled={itemCount === 0}>
  Checkout with Shopify
</button>
```

`proceedToCheckout` opens `cart.checkoutUrl` in a new tab. The `?channel=online_store` parameter is already there.

### Image handling

- **App-only images** (logos, hero shots, editorial photography): upload with `manus-upload-file --webdev` → use `/manus-storage/xxx` URLs in the app.
- **Shopify product images**: generate with `image_generate` using `model = nano-banana-2` (MANDATORY — this is required for speed). Pass the resulting public URL(s) to `shopify_create_product` (or `shopify_update_product`) via `media_urls`.

### Smoke-test the live API from the running dev server

Once the dev server is up and the catalog is seeded, you can confirm the live tRPC surface in one shot (no UI required):

```bash
curl "$PREVIEW_URL/api/trpc/commerce.products.list?batch=1&input=%7B%220%22%3A%7B%7D%7D"
```

The first product's normalized JSON shape will match the `Product` type above. Use this when something looks wrong on a page to localize the issue to (a) data, (b) UI, or (c) caching.

### Adding a new capability

If the scaffold doesn't expose what you need:

1. Add a `storefrontFetch` function to `server/_core/shopify.ts` returning a normalized type (new shapes → add raw types + a normalizer to `server/_core/shopifyNormalize.ts`).
2. Add a zod-validated procedure in `server/routers/commerce.ts` that calls it, then use it on the frontend via `trpc.commerce.*`.

Keep `@shared/commerce/types` as the UI's only commerce data source.

---

## Discount Stacking (`combinesWith`)

The `shopify_create_basic_discount_code` and `shopify_create_free_shipping_code` tools don't expose `combinesWith`. To enable stacking, follow up with a raw `shopify_mutation` on the returned discount `id` — `discountCodeBasicUpdate` for basic codes, `discountCodeFreeShippingUpdate` for free-shipping codes — setting `combinesWith` (`orderDiscounts` / `productDiscounts` / `shippingDiscounts`).

---

## Things to Avoid

- **Do NOT expose discount codes on the storefront frontend.** Never hardcode, render, or hint at discount codes in the UI (banners, product pages, cart, checkout buttons, footers, etc.). Discount codes are entered by the customer at Shopify's checkout page.
- **Do NOT write a script to batch-invoke any MCP operations.** Call the Shopify MCP tools directly for each operation — never wrap them in a shell loop, Node script, `curl` invocation, or any other automation. The Shopify Admin credentials live inside the MCP tool and are not available to your scripts.
- **Do NOT bypass the scaffold.** Do not import raw Shopify shapes into the frontend. Do not call the Storefront API from the browser. Do not write a parallel `storefrontFetch` in feature code. Do not type component props with `ReturnType<typeof useQuery>["data"]` — use the `Product` / `Cart` types from `@shared/commerce/types`. Do not use `cart.lines.edges` — the normalized shape is `cart.items`.
- **Do NOT seed more than 1–2 products** to make a feature look more populated. See the seeding rule above.

---

## Common Errors & Fixes

These are the errors you can actually hit from feature code or during seeding. Scaffold-internal errors are intentionally omitted.

| Error / Symptom | Cause | Fix |
|---|---|---|
| `pnpm shopify:probe` returns "no product had all of title + image + price" | Product missing one of the three required fields | Use `shopify_get_products` to find which is missing; fix via `shopify_update_product` / `shopify_update_product_variants`, then re-run the probe. |
| `pnpm shopify:probe` returns "received 0 products" | Nothing published to the Manus channel | Run `shopify_publish_product` for each product (defaults to the Manus channel). |
| Storefront returns empty **or** checkout shows a password page | Store is password-protected | Disable in Shopify Admin → Online Store → Preferences. |
| `shopify_create_product` errors: "publish=true requires status='ACTIVE'" | Trying to publish a draft product | Set `status: "ACTIVE"` alongside `publish: true`, or omit `publish` and call `shopify_publish_product` separately. |
| Product variant shows price `0.00` | `price` not passed to `shopify_create_product` | Pass `price` at creation, or fix via `shopify_update_product_variants` afterwards. |
| `commerce.cart.create` fails with "merchandise does not exist" | Variant not published to the Manus channel | Call `shopify_publish_product` for the parent product (defaults to Manus). |
| `commerce.*` throws `TRPCError({ code: "BAD_REQUEST" })` | Shopify `userErrors[]` came back from a cart mutation | Read the message — almost always a stale `cartId`, invalid `variantId`, or quantity out of range. The scaffold already turns `userErrors` into typed errors so callers don't need to check the array. |
| `commerce.products.byHandle` throws `NOT_FOUND` | Handle doesn't exist | Verify with `pnpm shopify:probe` (lists every handle the scaffold sees). |
| `commerce.*` throws `INTERNAL_SERVER_ERROR` with "Shopify Storefront API returned HTTP 5xx" | Transient Shopify outage | Retry. If persistent, check server logs for the GraphQL error message the scaffold printed. |
| Product image still missing after `media_urls` upload | Shopify processes images async (5–15s typical) | Continue building UI; re-run `pnpm shopify:probe` after ~15s to confirm. Do not block waiting. |
| "This store can't accept payments right now" at checkout | Payment provider not configured | User must claim the store first (Settings → Integrations → Shopify), then enable payments in Shopify Admin → Settings → Payments. |
