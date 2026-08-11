import { prisma } from '../prisma.js';

export const CURRENCY = 'NGN';
export const CURRENCY_SYMBOL = '₦';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate: number; // how many base-currency (NGN) units equal 1 foreign unit
  decimals: number;
  isDefault?: boolean;
}

export function toKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function formatKobo(kobo: number): string {
  const naira = kobo / 100;
  return `${CURRENCY_SYMBOL}${naira.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function nairaValue(kobo: number): number {
  return kobo / 100;
}

export async function getCurrencies(): Promise<Currency[]> {
  const setting = await prisma.restaurantSetting.findFirst();
  const map = (setting?.mapSettings as Record<string, unknown> | undefined) ?? {};
  const list = Array.isArray(map.currencies) ? map.currencies : [];
  const currencies = list
    .map((c: any) => ({
      code: String(c.code ?? '').toUpperCase(),
      name: String(c.name ?? c.code ?? ''),
      symbol: String(c.symbol ?? c.code ?? ''),
      rate: Number(c.rate),
      decimals: Number.isFinite(Number(c.decimals)) ? Number(c.decimals) : 2,
    }))
    .filter((c) => c.code && Number.isFinite(c.rate) && c.rate > 0);

  if (!currencies.find((c) => c.code === CURRENCY)) {
    currencies.unshift({ code: CURRENCY, name: 'Nigerian Naira', symbol: CURRENCY_SYMBOL, rate: 1, decimals: 2 });
  }
  return currencies;
}

export async function getCurrency(code: string): Promise<Currency> {
  const currencies = await getCurrencies();
  return currencies.find((c) => c.code === code.toUpperCase()) ?? currencies.find((c) => c.code === CURRENCY)!;
}

export function convertKoboToMinor(kobo: number, currency: Currency): number {
  const naira = kobo / 100;
  const foreign = naira / currency.rate;
  return Math.round(foreign * Math.pow(10, currency.decimals));
}

export function convertMinorToKobo(minor: number, currency: Currency): number {
  const foreign = minor / Math.pow(10, currency.decimals);
  const naira = foreign * currency.rate;
  return Math.round(naira * 100);
}

export function formatKoboInCurrency(kobo: number, currencyCode: string, currencies?: Currency[]): string {
  const currency = currencies?.find((c) => c.code === currencyCode.toUpperCase()) ?? { code: currencyCode, symbol: currencyCode, rate: 1, decimals: 2, name: currencyCode } as Currency;
  const naira = kobo / 100;
  const foreign = naira / currency.rate;
  const amount = foreign.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: currency.decimals });
  return `${currency.symbol}${amount}`;
}
