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

export interface AdminDashboardResponse {
  generated_at: string;
  summary: AdminOverviewResponse;
  worker: OpsWorkerHealth;
  providers: OpsProviderHealthRow[];
  risk_flags: OpsRiskFlag[];
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

export interface SwapTimelineEvent {
  status: string;
  message?: string | null;
  created_at: string;
}

export interface SwapTimelineResponse {
  swap_id: string;
  timeline: SwapTimelineEvent[];
}

export interface SwapOpsActionResponse {
  action: string;
  message: string;
  status: SwapStatusResponse;
}

export interface OpsSearchQuery {
  q: string;
  limit?: number;
}

export interface OpsSearchSwapResult {
  id: string;
  provider: string;
  provider_swap_id?: string | null;
  status: string;
  from_currency: string;
  from_network: string;
  to_currency: string;
  to_network: string;
  amount: number;
  estimated_receive: number;
  client_id?: string | null;
  user_id?: string | null;
  tx_hash_in?: string | null;
  tx_hash_out?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpsSearchGiftCardResult {
  id: string;
  trade_id?: string | null;
  order_kind: string;
  product_id?: string | null;
  prepaid_provider?: string | null;
  currency_code?: string | null;
  recipient_email_masked: string;
  status: string;
  provider_status?: string | null;
  provider?: string | null;
  provider_trade_id?: string | null;
  source_ticker: string;
  source_network: string;
  amount: number;
  amount_to?: number | null;
  client_id?: string | null;
  user_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpsSearchSupportResult {
  wa_id: string;
  status: string;
  tag?: string | null;
  assigned_to?: string | null;
  state: string;
  updated_at: string;
}

export interface OpsSearchResponse {
  query: string;
  swaps: OpsSearchSwapResult[];
  giftcards: OpsSearchGiftCardResult[];
  support: OpsSearchSupportResult[];
}

export interface OpsProviderHealthRow {
  provider: string;
  open_swaps: number;
  failed_swaps_24h: number;
  giftcard_active: number;
  giftcard_failed_24h: number;
  last_activity_at?: string | null;
}

export interface OpsWorkerHealth {
  giftcard_queued: number;
  giftcard_retry_pending: number;
  giftcard_creating: number;
  giftcard_stale_active: number;
  swap_polling_due: number;
  swap_polling_stale: number;
  webhook_retry_due: number;
  webhook_dead_letters: number;
}

export interface OpsRiskFlag {
  entity_type: string;
  entity_id: string;
  severity: string;
  code: string;
  message: string;
}

export interface OpsHealthResponse {
  generated_at: string;
  worker: OpsWorkerHealth;
  providers: OpsProviderHealthRow[];
  risk_flags: OpsRiskFlag[];
}

export interface OpsFinanceQuery {
  date_from?: string;
  date_to?: string;
}

export interface OpsFinanceTotals {
  completed_swaps: number;
  failed_swaps: number;
  expired_swaps: number;
  swap_volume_input: number;
  swap_platform_fees: number;
  swap_provider_fees: number;
  giftcard_completed: number;
  giftcard_failed: number;
  giftcard_volume: number;
}

export interface OpsFinanceDailyRow {
  date: string;
  completed_swaps: number;
  failed_swaps: number;
  swap_volume_input: number;
  swap_platform_fees: number;
  giftcard_completed: number;
  giftcard_volume: number;
}

export interface OpsFinanceProviderRow {
  provider: string;
  swaps: number;
  completed_swaps: number;
  failed_swaps: number;
  volume_input: number;
  platform_fees: number;
}

export interface OpsFinanceResponse {
  generated_at: string;
  totals: OpsFinanceTotals;
  daily: OpsFinanceDailyRow[];
  providers: OpsFinanceProviderRow[];
}

export interface OpsWebhookDeliveryRow {
  id: string;
  swap_id: string;
  event_type: string;
  attempt_number: number;
  max_attempts: number;
  next_retry_at?: string | null;
  delivered_at?: string | null;
  response_status?: number | null;
  response_time_ms?: number | null;
  error_message?: string | null;
  is_dlq: boolean;
  created_at: string;
  updated_at: string;
}

export interface OpsWebhookMonitorResponse {
  deliveries: OpsWebhookDeliveryRow[];
}

export interface OpsCreateNoteRequest {
  entity_type: string;
  entity_id: string;
  note: string;
}

export interface OpsNoteResponse {
  id: number;
  entity_type: string;
  entity_id: string;
  admin_email: string;
  note: string;
  created_at: string;
}

export interface AdminGiftCardOrderQuery {
  status?: string;
  email?: string;
  trade_id?: string;
  client_id?: string;
  provider?: string;
  product_id?: string;
  limit?: number;
}

export interface AdminGiftCardOrderSummary {
  order_id: string;
  trade_id?: string | null;
  order_kind: string;
  product_id?: string | null;
  prepaid_provider?: string | null;
  currency_code?: string | null;
  provider?: string | null;
  provider_trade_id?: string | null;
  recipient_email_masked: string;
  status: string;
  provider_status?: string | null;
  ticker_from: string;
  network_from: string;
  amount_from: number;
  amount_to?: number | null;
  queued: boolean;
  retryable: boolean;
  last_error?: string | null;
  attempt_count: number;
  next_retry_at?: string | null;
  last_synced_at?: string | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface AdminGiftCardOrderListResponse {
  orders: AdminGiftCardOrderSummary[];
}

export interface AdminGiftCardOrderDetailResponse {
  order: AdminGiftCardOrderSummary;
  deposit_address?: string | null;
  deposit_extra_id?: string | null;
  settlement_address?: string | null;
  settlement_extra_id?: string | null;
  refund_address?: string | null;
  refund_extra_id?: string | null;
  details_masked: boolean;
  risk_flags: string[];
}

export interface AdminGiftCardRevealRequest {
  reason: string;
}

export interface CardOrderDetailsResponse {
  hashout?: string | null;
  id?: string | null;
  email?: string | null;
  status?: string | null;
  value?: string | null;
  activation_link?: string | null;
  redeem_code?: string | null;
  extra: Record<string, unknown>;
}

export interface AdminGiftCardRevealResponse {
  order_id: string;
  recipient_email: string;
  provider_password?: string | null;
  activation_link?: string | null;
  redeem_code?: string | null;
  details?: CardOrderDetailsResponse | null;
}

export interface AdminGiftCardActionResponse {
  action: string;
  message: string;
  order: AdminGiftCardOrderDetailResponse;
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
