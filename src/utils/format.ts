export function formatDateTime(value?: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatDateShort(value?: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatAmount(value?: number | null, digits = 6): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatCurrencyAmount(value?: number | null, currency?: string | null, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }

  return `${formatAmount(value, digits)}${currency ? ` ${currency}` : ''}`;
}

export function formatCompactNumber(value?: number | null, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value?: number | null, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }

  return `${formatAmount(value, digits)}%`;
}

export function formatPair(
  fromCurrency?: string | null,
  fromNetwork?: string | null,
  toCurrency?: string | null,
  toNetwork?: string | null,
): string {
  const from = [fromCurrency, fromNetwork].filter(Boolean).join(' · ');
  const to = [toCurrency, toNetwork].filter(Boolean).join(' · ');
  return [from || '—', to || '—'].join(' -> ');
}

export function truncateMiddle(value?: string | null, visible = 8): string {
  if (!value) {
    return '—';
  }

  if (value.length <= visible * 2) {
    return value;
  }

  return `${value.slice(0, visible)}…${value.slice(-visible)}`;
}

export function maskEmail(value?: string | null): string {
  if (!value || !value.includes('@')) {
    return value || '—';
  }

  const [name, domain] = value.split('@');
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${'*'.repeat(Math.max(1, name.length - visible.length))}@${domain}`;
}
