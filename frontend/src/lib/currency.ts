import type { Currency } from './api';

export function formatKoboInCurrency(kobo: number, currencyCode: string, currencies: Currency[] = []): string {
  const currency = currencies.find((c) => c.code === currencyCode.toUpperCase()) ?? currencies.find((c) => c.isDefault || c.code === 'NGN');
  if (!currency) {
    const naira = kobo / 100;
    return `₦${naira.toLocaleString('en-NG')}`;
  }
  const naira = kobo / 100;
  const foreign = naira / currency.rate;
  const amount = foreign.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: currency.decimals });
  return `${currency.symbol}${amount}`;
}

export function convertKoboToMinor(kobo: number, currency: Currency): number {
  const naira = kobo / 100;
  const foreign = naira / currency.rate;
  return Math.round(foreign * Math.pow(10, currency.decimals));
}
