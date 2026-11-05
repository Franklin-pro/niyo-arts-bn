type ShippingRates = Record<string, Record<string, number>>;

export function getShippingCost(country: string, currency: string): number {
  const rawRates = process.env.SHIPPING_RATES_JSON;
  if (!rawRates) return 0;

  let rates: ShippingRates;
  try {
    rates = JSON.parse(rawRates) as ShippingRates;
  } catch {
    throw new Error("SHIPPING_RATES_JSON must be valid JSON.");
  }
  const countryRates = rates[country.trim().toUpperCase()] || rates.DEFAULT;
  const amount = countryRates?.[currency.toUpperCase()] ?? 0;
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    (currency.toUpperCase() === "RWF" && !Number.isInteger(amount))
  ) {
    throw new Error("SHIPPING_RATES_JSON contains an invalid shipping amount.");
  }
  return amount;
}
