import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ deleteCatalogProduct: vi.fn() }));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, ...mocks };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const context = (role: "admin" | "user") => ({
  user: { id: 1, openId: "catalog-remove-test", email: "catalog@example.com", name: "Catalog Tester", loginMethod: "test", role },
  req: { protocol: "https", headers: {} },
  res: {},
}) as unknown as TrpcContext;

describe("catalog removal", () => {
  it("allows an admin to remove an unavailable suit", async () => {
    mocks.deleteCatalogProduct.mockResolvedValue({ success: true, id: 17 });
    const result = await appRouter.createCaller(context("admin")).catalog.remove({ id: 17 });
    expect(result).toEqual({ success: true, id: 17 });
    expect(mocks.deleteCatalogProduct).toHaveBeenCalledWith(17);
  });
});

