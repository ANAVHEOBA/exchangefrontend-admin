import { apiClient } from '../client';
import { API_CONFIG } from '~/config/api';
import type {
  AdminConversationDetailResponse,
  AdminConversationListResponse,
  AdminDashboardResponse,
  AdminConversationQuery,
  AdminGiftCardActionResponse,
  AdminGiftCardOrderDetailResponse,
  AdminGiftCardOrderListResponse,
  AdminGiftCardOrderQuery,
  AdminGiftCardRevealRequest,
  AdminGiftCardRevealResponse,
  AdminLoginRequest,
  AdminLoginResponse,
  AdminOverviewResponse,
  AdminSwapExportQuery,
  AdminSwapHistoryResponse,
  AdminSwapQuery,
  OpsCreateNoteRequest,
  OpsFinanceQuery,
  OpsFinanceResponse,
  OpsHealthResponse,
  OpsNoteResponse,
  OpsSearchQuery,
  OpsSearchResponse,
  OpsWebhookMonitorResponse,
  StoredAdminSession,
  SwapOpsActionResponse,
  SwapStatusResponse,
  SwapTimelineResponse,
  UpdateAdminConversationRequest,
} from '~/types/admin';

const toStoredSession = (response: AdminLoginResponse): StoredAdminSession => ({
  accessToken: response.access_token,
  refreshToken: response.refresh_token,
  tokenType: response.token_type,
  adminId: response.admin.id,
  adminEmail: response.admin.email,
});

export const adminApi = {
  login(request: AdminLoginRequest): Promise<AdminLoginResponse> {
    return apiClient.post<AdminLoginResponse>(API_CONFIG.endpoints.adminLogin, request);
  },

  async loginAndStoreSession(request: AdminLoginRequest): Promise<AdminLoginResponse> {
    const response = await this.login(request);
    apiClient.setSession(toStoredSession(response));
    return response;
  },

  clearSession(): void {
    apiClient.clearSession();
  },

  getSession(): StoredAdminSession | null {
    return apiClient.getSession();
  },

  getDashboard(): Promise<AdminDashboardResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<AdminDashboardResponse>(API_CONFIG.endpoints.adminDashboard),
    );
  },

  getOverview(): Promise<AdminOverviewResponse> {
    return apiClient.withRetry(() => apiClient.get<AdminOverviewResponse>(API_CONFIG.endpoints.adminOverview));
  },

  search(query: OpsSearchQuery): Promise<OpsSearchResponse> {
    return apiClient.withRetry(() => apiClient.get<OpsSearchResponse>(API_CONFIG.endpoints.adminSearch, query));
  },

  getHealth(): Promise<OpsHealthResponse> {
    return apiClient.withRetry(() => apiClient.get<OpsHealthResponse>(API_CONFIG.endpoints.adminHealth));
  },

  getFinance(query: OpsFinanceQuery): Promise<OpsFinanceResponse> {
    return apiClient.withRetry(() => apiClient.get<OpsFinanceResponse>(API_CONFIG.endpoints.adminFinance, query));
  },

  getWebhookMonitor(): Promise<OpsWebhookMonitorResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<OpsWebhookMonitorResponse>(API_CONFIG.endpoints.adminWebhooks),
    );
  },

  createNote(request: OpsCreateNoteRequest): Promise<OpsNoteResponse> {
    return apiClient.post<OpsNoteResponse>(API_CONFIG.endpoints.adminNotes, request);
  },

  listSwaps(query: AdminSwapQuery): Promise<AdminSwapHistoryResponse> {
    return apiClient.withRetry(() => apiClient.get<AdminSwapHistoryResponse>(API_CONFIG.endpoints.adminSwaps, query));
  },

  getSwap(id: string): Promise<SwapStatusResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<SwapStatusResponse>(`${API_CONFIG.endpoints.adminSwapDetail}/${encodeURIComponent(id)}`),
    );
  },

  getSwapTimeline(id: string): Promise<SwapTimelineResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<SwapTimelineResponse>(
        `${API_CONFIG.endpoints.adminSwapDetail}/${encodeURIComponent(id)}/timeline`,
      ),
    );
  },

  refreshSwap(id: string): Promise<SwapOpsActionResponse> {
    return apiClient.post<SwapOpsActionResponse>(
      `${API_CONFIG.endpoints.adminSwapDetail}/${encodeURIComponent(id)}/refresh`,
    );
  },

  reconcileSwap(id: string): Promise<SwapOpsActionResponse> {
    return apiClient.post<SwapOpsActionResponse>(
      `${API_CONFIG.endpoints.adminSwapDetail}/${encodeURIComponent(id)}/reconcile`,
    );
  },

  exportSwapsCsv(query: AdminSwapExportQuery): Promise<Blob> {
    return apiClient.download(API_CONFIG.endpoints.adminSwapExport, query);
  },

  listGiftcardOrders(query: AdminGiftCardOrderQuery): Promise<AdminGiftCardOrderListResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<AdminGiftCardOrderListResponse>(API_CONFIG.endpoints.adminGiftcardOrders, query),
    );
  },

  getGiftcardOrder(orderRef: string): Promise<AdminGiftCardOrderDetailResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<AdminGiftCardOrderDetailResponse>(
        `${API_CONFIG.endpoints.adminGiftcardOrders}/${encodeURIComponent(orderRef)}`,
      ),
    );
  },

  retryGiftcardOrder(orderRef: string): Promise<AdminGiftCardActionResponse> {
    return apiClient.post<AdminGiftCardActionResponse>(
      `${API_CONFIG.endpoints.adminGiftcardOrders}/${encodeURIComponent(orderRef)}/retry`,
    );
  },

  reconcileGiftcardOrder(orderRef: string): Promise<AdminGiftCardActionResponse> {
    return apiClient.post<AdminGiftCardActionResponse>(
      `${API_CONFIG.endpoints.adminGiftcardOrders}/${encodeURIComponent(orderRef)}/reconcile`,
    );
  },

  revealGiftcardOrder(
    orderRef: string,
    request: AdminGiftCardRevealRequest,
  ): Promise<AdminGiftCardRevealResponse> {
    return apiClient.post<AdminGiftCardRevealResponse>(
      `${API_CONFIG.endpoints.adminGiftcardOrders}/${encodeURIComponent(orderRef)}/reveal`,
      request,
    );
  },

  listConversations(query: AdminConversationQuery): Promise<AdminConversationListResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<AdminConversationListResponse>(API_CONFIG.endpoints.adminWhatsappConversations, query),
    );
  },

  getConversation(waId: string): Promise<AdminConversationDetailResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<AdminConversationDetailResponse>(
        `${API_CONFIG.endpoints.adminWhatsappConversations}/${encodeURIComponent(waId)}`,
      ),
    );
  },

  updateConversation(
    waId: string,
    request: UpdateAdminConversationRequest,
  ): Promise<AdminConversationDetailResponse['conversation']> {
    return apiClient.patch<AdminConversationDetailResponse['conversation']>(
      `${API_CONFIG.endpoints.adminWhatsappConversations}/${encodeURIComponent(waId)}`,
      request,
    );
  },
};
