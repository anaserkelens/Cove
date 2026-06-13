const zeroDecimalCurrencies = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "ISK",
  "JPY",
  "KRW",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

export function getCurrencyMinorUnit(currencyCode: string): number {
  return zeroDecimalCurrencies.has(currencyCode.toUpperCase()) ? 0 : 2;
}

export function parseMoneyMajorToMinor(
  value: string,
  currencyCode: string,
): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const normalizedCurrency = currencyCode.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
    throw new Error("Invalid currency code.");
  }

  const minorUnit = getCurrencyMinorUnit(normalizedCurrency);
  const pattern =
    minorUnit === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${minorUnit}})?$`);

  if (!pattern.test(trimmed)) {
    throw new Error("Invalid money amount.");
  }

  const [majorPart, fractionPart = ""] = trimmed.split(".");
  const multiplier = 10 ** minorUnit;
  const majorMinor = BigInt(majorPart) * BigInt(multiplier);
  const fractionMinor = BigInt(fractionPart.padEnd(minorUnit, "0") || "0");
  const total = majorMinor + fractionMinor;

  if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Money amount is too large.");
  }

  return Number(total);
}

export function formatMinorMoney(
  amountMinor: number | null,
  currencyCode: string | null,
): string {
  if (amountMinor === null || !currencyCode) {
    return "";
  }

  const minorUnit = getCurrencyMinorUnit(currencyCode);

  return new Intl.NumberFormat("en", {
    currency: currencyCode,
    maximumFractionDigits: minorUnit,
    minimumFractionDigits: minorUnit,
    style: "currency",
  }).format(amountMinor / 10 ** minorUnit);
}

export function formatMinorMoneyInput(
  amountMinor: number | null,
  currencyCode: string | null,
): string {
  if (amountMinor === null || !currencyCode) {
    return "";
  }

  const minorUnit = getCurrencyMinorUnit(currencyCode);

  return (amountMinor / 10 ** minorUnit).toFixed(minorUnit);
}
