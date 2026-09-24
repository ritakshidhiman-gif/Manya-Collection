import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: AuthenticatedUser["role"]): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "catalog-test-user",
      email: "catalog@example.com",
      name: "Catalog Tester",
      loginMethod: "test",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("catalog procedures", () => {
  it("rejects catalog writes from non-admin users", async () => {
    const caller = appRouter.createCaller(createContext("user"));

    await expect(caller.catalog.create({
      name: "Test Suit",
      category: "Cotton",
      gender: "Women",
      color: "Ivory",
      price: 2490,
      sizes: ["S", "M"],
      image: "https://example.com/suit.jpg",
      description: "A test input used only for access-control validation.",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects catalog photo uploads from non-admin users", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.catalog.uploadImage({ fileName: "suit.png", contentType: "image/png", dataBase64: "a".repeat(100) })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects catalog deletion from non-admin users", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.catalog.remove({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("validates image URLs before an admin write reaches the database", async () => {
    const caller = appRouter.createCaller(createContext("admin"));

    await expect(caller.catalog.create({
      name: "Invalid Image Suit",
      category: "Festive",
      gender: "Women",
      color: "Rose",
      price: 3290,
      sizes: ["S", "M"],
      image: "not-a-url",
      description: "The input should fail before any database write.",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
