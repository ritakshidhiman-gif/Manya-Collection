import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { catalogProducts, emailOtpChallenges, InsertCatalogProduct, InsertEmailOtpChallenge, InsertOrder, InsertOrderItem, InsertPayment, InsertUser, orderItems, orders, payments, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export function isOwnerEmail(email: string | null | undefined) {
  return Boolean(ENV.ownerEmail && email?.trim().toLowerCase() === ENV.ownerEmail);
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId || isOwnerEmail(user.email)) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function listCatalogProducts() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(catalogProducts).orderBy(asc(catalogProducts.createdAt));
}

export async function createCatalogProduct(product: Omit<InsertCatalogProduct, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(catalogProducts).values(product);
  const created = await db.select().from(catalogProducts).where(eq(catalogProducts.slug, product.slug)).limit(1);
  return created[0];
}

export async function deleteCatalogProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(catalogProducts).where(eq(catalogProducts.id, id));
  return { success: true } as const;
}

export async function createEmailOtpChallenge(challenge: Omit<InsertEmailOtpChallenge, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(emailOtpChallenges).values(challenge);
  const created = await db.select().from(emailOtpChallenges)
    .where(eq(emailOtpChallenges.email, challenge.email))
    .orderBy(desc(emailOtpChallenges.createdAt))
    .limit(1);
  return created[0];
}

export async function getLatestEmailOtpChallenge(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.select().from(emailOtpChallenges)
    .where(eq(emailOtpChallenges.email, email))
    .orderBy(desc(emailOtpChallenges.createdAt))
    .limit(1);
  return result[0];
}

export async function incrementEmailOtpAttempts(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(emailOtpChallenges)
    .set({ attempts: sql`${emailOtpChallenges.attempts} + 1` })
    .where(eq(emailOtpChallenges.id, id));
}

export async function consumeEmailOtpChallenge(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(emailOtpChallenges).where(eq(emailOtpChallenges.id, id));
}

export async function getCatalogProductsByIds(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  if (ids.length === 0) return [];
  return db.select().from(catalogProducts).where(inArray(catalogProducts.id, ids));
}

export async function createPendingOrder(order: InsertOrder, items: Omit<InsertOrderItem, "id" | "createdAt" | "orderId">[], payment: Omit<InsertPayment, "id" | "createdAt" | "updatedAt" | "orderId">) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async (tx) => {
    await tx.insert(orders).values(order);
    const createdOrder = await tx.select().from(orders).where(eq(orders.orderNumber, order.orderNumber)).limit(1);
    const savedOrder = createdOrder[0];
    if (!savedOrder) throw new Error("Order was not created");
    await tx.insert(orderItems).values(items.map((item) => ({ ...item, orderId: savedOrder.id })));
    await tx.insert(payments).values({ ...payment, orderId: savedOrder.id });
    return savedOrder;
  });
}

export async function getPaymentByProviderOrderId(providerOrderId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.select().from(payments).where(eq(payments.providerOrderId, providerOrderId)).limit(1);
  return result[0];
}

export async function listOrders() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function updateOrderStatus(orderId: number, status: "pending_payment" | "processing" | "completed" | "failed" | "cancelled") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(orders).set({ status }).where(eq(orders.id, orderId));
  const updated = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return updated[0] ?? null;
}

export async function markPaymentFailed(providerOrderId: string, outcome: "failed" | "cancelled") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const payment = await getPaymentByProviderOrderId(providerOrderId);
  if (!payment) return null;
  await db.update(payments).set({ status: "failed" }).where(eq(payments.id, payment.id));
  await db.update(orders).set({ status: outcome }).where(eq(orders.id, payment.orderId));
  return { orderId: payment.orderId };
}

export async function markPaymentCaptured(providerOrderId: string, providerPaymentId: string, signature: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const payment = await getPaymentByProviderOrderId(providerOrderId);
  if (!payment) return null;
  await db.update(payments).set({ providerPaymentId, signature, status: "captured" }).where(eq(payments.id, payment.id));
  await db.update(orders).set({ status: "processing" }).where(eq(orders.id, payment.orderId));
  return { orderId: payment.orderId, paymentId: providerPaymentId };
}
