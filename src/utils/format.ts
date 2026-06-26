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

export function formatAmount(value?: number | null, digits = 6): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
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
