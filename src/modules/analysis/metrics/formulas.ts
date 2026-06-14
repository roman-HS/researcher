import type { Money } from "@/contracts/domain/primitives";

/**
 * Pure financial helpers for deterministic investment metric calculations.
 *
 * @see Story 6.4.1 — Implement Metrics Calculation executor
 */

export function parseMoneyAmount(money: Money): number {
  return Number.parseFloat(money.amount);
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundRatio(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/**
 * Fixed-rate amortizing monthly payment.
 * When the annual rate is zero, payment is straight-line principal / term.
 */
export function calculateMonthlyMortgagePayment(
  loanAmount: number,
  interestRateAnnual: number,
  loanTermYears: number,
): number {
  if (loanAmount <= 0) {
    return 0;
  }

  const months = loanTermYears * 12;

  if (months <= 0) {
    return 0;
  }

  if (interestRateAnnual <= 0) {
    return roundMoney(loanAmount / months);
  }

  const monthlyRate = interestRateAnnual / 100 / 12;
  const factor = (1 + monthlyRate) ** months;
  const payment = (loanAmount * monthlyRate * factor) / (factor - 1);

  return roundMoney(payment);
}

export function calculateMonthlyPropertyTax(
  purchasePrice: number,
  propertyTaxRate: number,
  taxAssessedValue: Money | undefined,
): number {
  if (taxAssessedValue) {
    return roundMoney(parseMoneyAmount(taxAssessedValue) / 12);
  }

  return roundMoney((propertyTaxRate / 100) * purchasePrice / 12);
}

export function calculateMonthlyHoa(
  configuredMonthlyHoa: number,
  providerHoaFee: Money | undefined,
): number {
  if (providerHoaFee) {
    return roundMoney(parseMoneyAmount(providerHoaFee));
  }

  return roundMoney(configuredMonthlyHoa);
}

export function calculateRentBasedExpense(
  grossMonthlyRent: number,
  ratePercent: number,
): number {
  return roundMoney((ratePercent / 100) * grossMonthlyRent);
}

export function calculateGrossRentMultiplier(
  purchasePrice: number,
  grossMonthlyRent: number,
): number {
  const annualGrossRent = grossMonthlyRent * 12;

  if (annualGrossRent <= 0) {
    return 0;
  }

  return roundRatio(purchasePrice / annualGrossRent);
}

export function calculateCapRate(
  purchasePrice: number,
  netOperatingIncomeAnnual: number,
): number {
  if (purchasePrice <= 0) {
    return 0;
  }

  return roundRatio(netOperatingIncomeAnnual / purchasePrice);
}

export function calculateCashOnCashReturn(
  cashInvested: number,
  annualCashFlow: number,
): number {
  if (cashInvested <= 0) {
    return 0;
  }

  return roundRatio(annualCashFlow / cashInvested);
}
