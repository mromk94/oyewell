import type { Currency } from './api';

export function formatKoboInCurrency(kobo: number, currencyCode: string | undefined, currencies: Currency[] = []): string {
  const code = (currencyCode ?? 'NGN').toUpperCase();
  const currency = currencies.find((c) => c.code === code);
  if (!currency) {
    const naira = kobo / 100;
    return `₦${naira.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  if (!Number.isFinite(currency.rate) || currency.rate <= 0) {
    const naira = kobo / 100;
    return `₦${naira.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  const decimals = Math.max(0, Math.min(20, Math.round(Number(currency.decimals) || 2)));
  const naira = kobo / 100;
  const foreign = naira / currency.rate;
  const amount = foreign.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
  return `${currency.symbol || code}${amount}`;
}

export function convertKoboToMinor(kobo: number, currency: Currency): number {
  const naira = kobo / 100;
  const foreign = naira / currency.rate;
  const decimals = Number.isFinite(currency.decimals) && currency.decimals >= 0 && currency.decimals <= 20
    ? Math.round(currency.decimals)
    : 2;
  return Math.round(foreign * Math.pow(10, decimals));
}
