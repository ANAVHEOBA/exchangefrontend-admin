export const STORAGE_KEYS = {
  accessToken: 'assetar.admin.access_token',
  refreshToken: 'assetar.admin.refresh_token',
  tokenType: 'assetar.admin.token_type',
  adminId: 'assetar.admin.id',
  adminEmail: 'assetar.admin.email',
} as const;

export const ADMIN_STATUS_OPTIONS = [
  'open',
  'contacted',
  'waiting_user',
  'pricing',
  'accepted',
  'rejected',
  'paid',
  'closed',
] as const;
