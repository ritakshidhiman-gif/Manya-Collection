import type { Money } from "@shared/commerce/types";

/**
 * Format a Money or raw amount string into a localized currency string.
 * Falls back to `$X` rounding if Intl rejects the currency code.
 */
export function formatMoney(value: Money | string | number, currencyCode?: string): string {
  let amountNum: number;
  let code: string;

  if (typeof value === "object" && value !== null && "amount" in value) {
    amountNum = Number.parseFloat(value.amount);
    code = value.currencyCode;
  } else {
    amountNum = typeof value === "string" ? Number.parseFloat(value) : value;
    code = currencyCode ?? "USD";
  }

  if (Number.isNaN(amountNum)) return "—";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: amountNum % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amountNum);
  } catch {
    return `$${amountNum.toFixed(0)}`;
  }
}
