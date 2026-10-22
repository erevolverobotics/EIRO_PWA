import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(minorUnits: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(minorUnits / 100);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function generateTeamCode(seasonYear: number, counter: number): string {
  return `EIRO-${seasonYear}-${String(counter).padStart(3, '0')}`;
}

export function generateIdempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function truncate(str: string, length = 30): string {
  return str.length > length ? str.slice(0, length) + '…' : str;
}
