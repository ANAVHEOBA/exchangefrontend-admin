export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminUser {
  id: string;
  email: string;
}

export interface AdminLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  admin: AdminUser;
}

export interface StoredAdminSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  adminId?: string;
  adminEmail?: string;
}

export interface AdminOverviewResponse {
  swaps: {
    open: number;
    failed_last_24h: number;
    refunded_last_24h: number;
  };
  whatsapp: {
    open_conversations: number;
    giftcard_sell_leads: number;
    waiting_user: number;
  };
}

export interface AdminSwapQuery {
  cursor?: string;
  limit?: number;
  status?: string;
  from_currency?: string;
  to_currency?: string;
  provider?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: string;
}

export interface AdminSwapExportQuery {
  provider?: string;
  provider_swap_id?: string;
  status?: string;
  from_currency?: string;
  from_network?: string;
  to_currency?: string;
  to_network?: string;
  user_id?: string;
  client_id?: string;
  date_from?: string;
  date_to?: string;
  is_sandbox?: boolean;
  is_payment?: boolean;
}

export interface PaginationInfo {
  limit: number;
  has_more: boolean;
  next_cursor?: string | null;
}

export interface SwapFiltersApplied {
  status?: string | null;
  from_currency?: string | null;
  to_currency?: string | null;
  provider?: string | null;
  date_from?: string | null;
  date_to?: string | null;
}

export interface SwapSummary {
  id: string;
  status: string;
  from_currency: string;
  from_network: string;
  to_currency: string;
  to_network: string;
  amount: number;
  estimated_receive: number;
  actual_receive?: number | null;
  rate: number;
  platform_fee: number;
  total_fee: number;
  deposit_address: string;
  recipient_address: string;
  provider: string;
  rate_type: string;
  is_sandbox: boolean;
  created_at: string;
  completed_at?: string | null;
}

export interface AdminSwapHistoryResponse {
  swaps: SwapSummary[];
  pagination: PaginationInfo;
  filters_applied: SwapFiltersApplied;
}

export interface SwapStatusResponse {
  swap_id: string;
  provider: string;
  provider_swap_id?: string | null;
  status: string;
  from: string;
  to: string;
  amount: number;
  deposit_address: string;
  deposit_extra_id?: string | null;
  recipient_address: string;
  recipient_extra_id?: string | null;
  rate: number;
  estimated_receive: number;
  actual_receive?: number | null;
  network_fee: number;
  total_fee: number;
  rate_type: string;
  is_sandbox: boolean;
  tx_hash_in?: string | null;
  tx_hash_out?: string | null;
  error?: string | null;
  created_at: string;
  updated_at: string;
  expires_at?: string | null;
  completed_at?: string | null;
}

export interface AdminConversationQuery {
  page?: number;
  limit?: number;
  admin_status?: string;
  admin_tag?: string;
  assigned_to?: string;
  state?: string;
  wa_id?: string;
}

export interface AdminConversationSummary {
  wa_id: string;
  phone_number_id: string;
  locale: string;
  state: string;
  admin_status: string;
  admin_tag?: string | null;
  assigned_to?: string | null;
  internal_note?: string | null;
  last_inbound_at?: string | null;
  last_outbound_at?: string | null;
  last_message_preview?: string | null;
  last_outbound_status?: string | null;
  last_error?: string | null;
  updated_at: string;
}

export interface AdminConversationPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface AdminConversationFiltersApplied {
  admin_status?: string | null;
  admin_tag?: string | null;
  assigned_to?: string | null;
  state?: string | null;
  wa_id?: string | null;
}

export interface AdminConversationListResponse {
  conversations: AdminConversationSummary[];
  pagination: AdminConversationPagination;
  filters_applied: AdminConversationFiltersApplied;
}

export interface AdminConversationEvent {
  id: string;
  event_kind: string;
  message_type?: string | null;
  provider_message_id?: string | null;
  text?: string | null;
  processed: number;
  attempt_count: number;
  last_error?: string | null;
  created_at: string;
}

export interface AdminOutboundMessage {
  id: string;
  message_kind: string;
  status: string;
  provider_message_id?: string | null;
  body: string;
  error_message?: string | null;
  sent_at?: string | null;
  created_at: string;
}

export interface RelatedSwapSummary {
  id: string;
  status: string;
  from_currency: string;
  from_network: string;
  to_currency: string;
  to_network: string;
  amount: number;
  estimated_receive: number;
  created_at: string;
}

export interface AdminConversationDetailResponse {
  conversation: AdminConversationSummary;
  events: AdminConversationEvent[];
  outbound_messages: AdminOutboundMessage[];
  related_swaps: RelatedSwapSummary[];
}

export interface UpdateAdminConversationRequest {
  admin_status?: string;
  admin_tag?: string;
  assigned_to?: string;
  internal_note?: string;
}
