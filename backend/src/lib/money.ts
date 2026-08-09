export const CURRENCY = 'NGN';
export const CURRENCY_SYMBOL = '₦';

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
