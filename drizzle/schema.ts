import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const catalogProducts = mysqlTable("catalogProducts", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  category: mysqlEnum("category", ["Cotton", "Festive", "Designer", "Winter"]).notNull(),
  gender: mysqlEnum("gender", ["Women", "Unisex"]).notNull().default("Women"),
  color: varchar("color", { length: 80 }).notNull(),
  price: int("price").notNull(),
  sizes: text("sizes").notNull(),
  image: text("image").notNull(),
  badge: varchar("badge", { length: 80 }),
  description: text("description").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CatalogProductRow = typeof catalogProducts.$inferSelect;
export type InsertCatalogProduct = typeof catalogProducts.$inferInsert;

export const emailOtpChallenges = mysqlTable("emailOtpChallenges", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  codeHash: varchar("codeHash", { length: 128 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  attempts: int("attempts").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailOtpChallenge = typeof emailOtpChallenges.$inferSelect;
export type InsertEmailOtpChallenge = typeof emailOtpChallenges.$inferInsert;

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 32 }).notNull().unique(),
  userId: int("userId"),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 32 }),
  addressLine1: varchar("addressLine1", { length: 240 }).notNull(),
  addressLine2: varchar("addressLine2", { length: 240 }),
  city: varchar("city", { length: 120 }).notNull(),
  state: varchar("state", { length: 120 }).notNull(),
  postalCode: varchar("postalCode", { length: 20 }).notNull(),
  subtotal: int("subtotal").notNull(),
  total: int("total").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  status: mysqlEnum("status", ["pending_payment", "processing", "completed", "failed", "cancelled"]).notNull().default("pending_payment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId"),
  productName: varchar("productName", { length: 180 }).notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: int("unitPrice").notNull(),
  size: varchar("size", { length: 20 }),
  color: varchar("color", { length: 80 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  provider: varchar("provider", { length: 40 }).notNull().default("razorpay"),
  providerOrderId: varchar("providerOrderId", { length: 80 }).notNull().unique(),
  providerPaymentId: varchar("providerPaymentId", { length: 80 }),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  status: mysqlEnum("status", ["created", "authorized", "captured", "failed"]).notNull().default("created"),
  signature: varchar("signature", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
