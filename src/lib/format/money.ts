import type { Money } from "@/contracts/domain/primitives";
import { DEFAULT_CURRENCY } from "@/contracts/domain/primitives";

const wholeDollarFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: DEFAULT_CURRENCY,
  maximumFractionDigits: 0,
});

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: DEFAULT_CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCents(cents: number): string {
  return wholeDollarFormatter.format(cents / 100);
}

export function formatNullableCents(cents: number | null): string {
  return cents === null ? "—" : formatCents(cents);
}

export function formatCurrencyAmount(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatNullableCurrencyAmount(amount: number | null): string {
  return amount === null ? "—" : formatCurrencyAmount(amount);
}

export function formatMoney(money: Money): string {
  return currencyFormatter.format(Number.parseFloat(money.amount));
}
