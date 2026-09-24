/**
 * Shopify Storefront API adapter.
 *
 * All Storefront access — catalog reads and cart reads/writes — goes through
 * this module. The Admin token is intentionally not used in app code; product
 * setup is performed once via the Shopify MCP tools.
 *
 * Layout follows the rest of `server/_core/*`:
 *   1. Transport (`storefrontFetch`) with TRPCError mapping
 *   2. GraphQL fragments (the contract for what we request)
 *   3. The eight capability functions, flat named exports:
 *      listProducts, getProductByHandle, listCollections,
 *      getCollectionByHandle, createCart, getCart,
 *      addCartLines, updateCartLines, removeCartLines
 *
 * Every function returns backend-agnostic `shared/commerce/types` via
 * `shopifyNormalize.ts` — the rest of the app never sees raw Shopify shapes.
 */

import { TRPCError } from "@trpc/server";
import type { Cart, Collection, Product } from "@shared/commerce/types";
import {
  type RawCart,
  type RawCollection,
  type RawProduct,
  normalizeCart,
  normalizeCollection,
  normalizeProduct,
} from "./shopifyNormalize";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Storefront API version pinned for the whole adapter.
 */
export const SHOPIFY_API_VERSION = "2025-04";

/** Lazy env access — tests can override `process.env` before each case. */
function getShopifyStoreDomain(): string {
  return process.env.SHOPIFY_STORE_DOMAIN ?? "";
}
function getShopifyStorefrontToken(): string {
  return process.env.SHOPIFY_STOREFRONT_API_ACCESS_TOKEN ?? "";
}
export function isShopifyConfigured(): boolean {
  return Boolean(getShopifyStoreDomain() && getShopifyStorefrontToken());
}
function shopifyStorefrontEndpoint(): string {
  return `https://${getShopifyStoreDomain()}/api/${SHOPIFY_API_VERSION}/graphql.json`;
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type ShopifyUserError = {
  message: string;
  field?: string[] | null;
  code?: string | null;
};

async function storefrontFetch<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!isShopifyConfigured()) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Shopify Storefront API is not configured",
    });
  }

  let response: Response;
  try {
    response = await fetch(shopifyStorefrontEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": getShopifyStorefrontToken(),
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (err) {
    console.error("[Shopify] Network error", err);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Shopify Storefront API is unreachable",
    });
  }

  if (!response.ok) {
    console.error(
      "[Shopify] HTTP",
      response.status,
      await response.text().catch(() => "")
    );
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Shopify Storefront API returned HTTP ${response.status}`,
    });
  }

  const json = (await response.json()) as GraphQLResponse<T>;
  if (json.errors && json.errors.length) {
    console.error("[Shopify] GraphQL errors", json.errors);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: json.errors[0].message || "Shopify Storefront API error",
    });
  }
  if (!json.data) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Shopify Storefront API returned no data",
    });
  }
  return json.data;
}

/**
 * Convert a `{ cart, userErrors }` mutation payload into a normalized cart.
 *
 * `userErrors` are user-correctable (invalid variant, qty out of range, etc.)
 * and become `BAD_REQUEST`. A missing cart with no userErrors is a server bug
 * and becomes `INTERNAL_SERVER_ERROR`.
 */
function unwrapCart(
  payload: { cart: RawCart | null; userErrors: ShopifyUserError[] },
  context: string
): Cart {
  if (payload.userErrors && payload.userErrors.length) {
    console.error(`[Shopify] ${context} userErrors`, payload.userErrors);
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: payload.userErrors[0].message || `Shopify ${context} failed`,
    });
  }
  if (!payload.cart) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Shopify ${context} returned no cart`,
    });
  }
  return normalizeCart(payload.cart);
}

// ---------------------------------------------------------------------------
// GraphQL fragments — single source of truth for what we request.
// Two rules baked in here:
//   - Never include `quantityAvailable` (requires a scope we don't have →
//     ACCESS_DENIED). Use `availableForSale: boolean` instead.
//   - Pin the API version (env.ts), keep fragments aligned with normalize.ts.
// ---------------------------------------------------------------------------

const MONEY_FRAGMENT = /* GraphQL */ `
  fragment MoneyFields on MoneyV2 {
    amount
    currencyCode
  }
`;

const IMAGE_FRAGMENT = /* GraphQL */ `
  fragment ImageFields on Image {
    url
    altText
    width
    height
  }
`;

const VARIANT_FRAGMENT = /* GraphQL */ `
  ${MONEY_FRAGMENT}
  fragment VariantFields on ProductVariant {
    id
    title
    availableForSale
    price { ...MoneyFields }
    compareAtPrice { ...MoneyFields }
    selectedOptions { name value }
  }
`;

const PRODUCT_FRAGMENT = /* GraphQL */ `
  ${IMAGE_FRAGMENT}
  ${VARIANT_FRAGMENT}
  fragment ProductFields on Product {
    id
    title
    handle
    description
    descriptionHtml
    productType
    vendor
    tags
    options { name values }
    priceRange {
      minVariantPrice { ...MoneyFields }
      maxVariantPrice { ...MoneyFields }
    }
    images(first: 8) {
      edges { node { ...ImageFields } }
    }
    variants(first: 25) {
      edges { node { ...VariantFields } }
    }
  }
`;

const COLLECTION_FRAGMENT = /* GraphQL */ `
  ${IMAGE_FRAGMENT}
  fragment CollectionFields on Collection {
    id
    handle
    title
    description
    image { ...ImageFields }
  }
`;

const CART_FRAGMENT = /* GraphQL */ `
  ${MONEY_FRAGMENT}
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      totalAmount { ...MoneyFields }
      subtotalAmount { ...MoneyFields }
    }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          cost { totalAmount { ...MoneyFields } }
          merchandise {
            ... on ProductVariant {
              id
              title
              price { ...MoneyFields }
              product {
                handle
                title
                images(first: 1) {
                  edges { node { url altText width height } }
                }
              }
            }
          }
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

type Edges<T> = { edges: Array<{ node: T }> };

export type ListProductsOptions = {
  first?: number;
  /** Optional handle of a collection to scope the listing to. */
  collectionHandle?: string;
};

export async function listProducts(
  options: ListProductsOptions = {}
): Promise<Product[]> {
  const first = options.first ?? 24;

  if (options.collectionHandle) {
    const data = await storefrontFetch<{
      collection: { products: Edges<RawProduct> } | null;
    }>(
      `${PRODUCT_FRAGMENT}
       query productsByCollection($handle: String!, $first: Int!) {
         collection(handle: $handle) {
           products(first: $first) {
             edges { node { ...ProductFields } }
           }
         }
       }`,
      { handle: options.collectionHandle, first }
    );
    if (!data.collection) return [];
    return data.collection.products.edges.map(e => normalizeProduct(e.node));
  }

  const data = await storefrontFetch<{ products: Edges<RawProduct> }>(
    `${PRODUCT_FRAGMENT}
     query listProducts($first: Int!) {
       products(first: $first, sortKey: TITLE) {
         edges { node { ...ProductFields } }
       }
     }`,
    { first }
  );
  return data.products.edges.map(e => normalizeProduct(e.node));
}

export async function getProductByHandle(handle: string): Promise<Product> {
  const data = await storefrontFetch<{ productByHandle: RawProduct | null }>(
    `${PRODUCT_FRAGMENT}
     query productByHandle($handle: String!) {
       productByHandle(handle: $handle) { ...ProductFields }
     }`,
    { handle }
  );
  if (!data.productByHandle) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Product "${handle}" not found`,
    });
  }
  return normalizeProduct(data.productByHandle);
}

export async function listCollections(first: number = 10): Promise<Collection[]> {
  const data = await storefrontFetch<{ collections: Edges<RawCollection> }>(
    `${COLLECTION_FRAGMENT}
     query listCollections($first: Int!) {
       collections(first: $first) {
         edges { node { ...CollectionFields } }
       }
     }`,
    { first }
  );
  return data.collections.edges.map(e => normalizeCollection(e.node));
}

export async function getCollectionByHandle(handle: string): Promise<Collection> {
  const data = await storefrontFetch<{ collection: RawCollection | null }>(
    `${COLLECTION_FRAGMENT}
     query collectionByHandle($handle: String!) {
       collection(handle: $handle) { ...CollectionFields }
     }`,
    { handle }
  );
  if (!data.collection) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Collection "${handle}" not found`,
    });
  }
  return normalizeCollection(data.collection);
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export type CartLineInput = { variantId: string; quantity: number };
export type CartLineUpdate = { lineId: string; quantity: number };

type CartMutationResponse<K extends string> = Record<
  K,
  { cart: RawCart | null; userErrors: ShopifyUserError[] }
>;

export async function createCart(lines: CartLineInput[]): Promise<Cart> {
  const data = await storefrontFetch<CartMutationResponse<"cartCreate">>(
    `${CART_FRAGMENT}
     mutation cartCreate($input: CartInput!) {
       cartCreate(input: $input) {
         cart { ...CartFields }
         userErrors { code field message }
       }
     }`,
    {
      input: {
        lines: lines.map(l => ({ merchandiseId: l.variantId, quantity: l.quantity })),
      },
    }
  );
  return unwrapCart(data.cartCreate, "cartCreate");
}

export async function getCart(cartId: string): Promise<Cart | null> {
  const data = await storefrontFetch<{ cart: RawCart | null }>(
    `${CART_FRAGMENT}
     query getCart($cartId: ID!) {
       cart(id: $cartId) { ...CartFields }
     }`,
    { cartId }
  );
  return data.cart ? normalizeCart(data.cart) : null;
}

export async function addCartLines(
  cartId: string,
  lines: CartLineInput[]
): Promise<Cart> {
  const data = await storefrontFetch<CartMutationResponse<"cartLinesAdd">>(
    `${CART_FRAGMENT}
     mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
       cartLinesAdd(cartId: $cartId, lines: $lines) {
         cart { ...CartFields }
         userErrors { code field message }
       }
     }`,
    {
      cartId,
      lines: lines.map(l => ({ merchandiseId: l.variantId, quantity: l.quantity })),
    }
  );
  return unwrapCart(data.cartLinesAdd, "cartLinesAdd");
}

export async function updateCartLines(
  cartId: string,
  updates: CartLineUpdate[]
): Promise<Cart> {
  const data = await storefrontFetch<CartMutationResponse<"cartLinesUpdate">>(
    `${CART_FRAGMENT}
     mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
       cartLinesUpdate(cartId: $cartId, lines: $lines) {
         cart { ...CartFields }
         userErrors { code field message }
       }
     }`,
    {
      cartId,
      lines: updates.map(u => ({ id: u.lineId, quantity: u.quantity })),
    }
  );
  return unwrapCart(data.cartLinesUpdate, "cartLinesUpdate");
}

export async function removeCartLines(
  cartId: string,
  lineIds: string[]
): Promise<Cart> {
  const data = await storefrontFetch<CartMutationResponse<"cartLinesRemove">>(
    `${CART_FRAGMENT}
     mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
       cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
         cart { ...CartFields }
         userErrors { code field message }
       }
     }`,
    { cartId, lineIds }
  );
  return unwrapCart(data.cartLinesRemove, "cartLinesRemove");
}
