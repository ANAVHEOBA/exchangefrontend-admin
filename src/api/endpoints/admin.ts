import { apiClient } from '../client';
import { API_CONFIG } from '~/config/api';
import type {
  AdminConversationDetailResponse,
  AdminConversationListResponse,
  AdminConversationQuery,
  AdminDashboardResponse,
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
  OpsAssetDetailResponse,
  OpsAssetListResponse,
  OpsAssetQuery,
  OpsAssetValidateRequest,
  OpsAssetValidateResponse,
  OpsCreateNoteRequest,
  OpsFinanceQuery,
  OpsFinanceResponse,
  OpsGiftCardCatalogDetailResponse,
  OpsGiftCardCatalogQuery,
  OpsGiftCardCatalogResponse,
  OpsHealthResponse,
  OpsNoteResponse,
  OpsProviderDetailResponse,
  OpsProviderListQuery,
  OpsProviderListResponse,
  OpsSearchQuery,
  OpsSearchResponse,
  OpsSettingsDiagnosticsResponse,
  OpsSettingsResponse,
  OpsSyncResponse,
  OpsWebhookDetailResponse,
  OpsWebhookMonitorResponse,
  OpsWebhookQuery,
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
    return apiClient.withRetry(() =>
      apiClient.get<AdminOverviewResponse>(API_CONFIG.endpoints.adminOverview),
    );
  },

  search(query: OpsSearchQuery): Promise<OpsSearchResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<OpsSearchResponse>(API_CONFIG.endpoints.adminSearch, query),
    );
  },

  getHealth(): Promise<OpsHealthResponse> {
    return apiClient.withRetry(() => apiClient.get<OpsHealthResponse>(API_CONFIG.endpoints.adminHealth));
  },

  getFinance(query: OpsFinanceQuery): Promise<OpsFinanceResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<OpsFinanceResponse>(API_CONFIG.endpoints.adminFinance, query),
    );
  },

  getWebhookMonitor(query?: OpsWebhookQuery): Promise<OpsWebhookMonitorResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<OpsWebhookMonitorResponse>(API_CONFIG.endpoints.adminWebhooks, query),
    );
  },

  getWebhookDelivery(deliveryId: string): Promise<OpsWebhookDetailResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<OpsWebhookDetailResponse>(
        `${API_CONFIG.endpoints.adminWebhooks}/${encodeURIComponent(deliveryId)}`,
      ),
    );
  },

  listAssets(query: OpsAssetQuery): Promise<OpsAssetListResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<OpsAssetListResponse>(API_CONFIG.endpoints.adminAssets, query),
    );
  },

  getAssetDetail(ticker: string, network: string): Promise<OpsAssetDetailResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<OpsAssetDetailResponse>(
        `${API_CONFIG.endpoints.adminAssets}/${encodeURIComponent(ticker)}`,
        { network },
      ),
    );
  },

  syncAssets(): Promise<OpsSyncResponse> {
    return apiClient.post<OpsSyncResponse>(API_CONFIG.endpoints.adminAssetSync);
  },

  validateAssetAddress(request: OpsAssetValidateRequest): Promise<OpsAssetValidateResponse> {
    return apiClient.post<OpsAssetValidateResponse>(API_CONFIG.endpoints.adminAssetValidate, request);
  },

  listGiftcardCatalog(query: OpsGiftCardCatalogQuery): Promise<OpsGiftCardCatalogResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<OpsGiftCardCatalogResponse>(API_CONFIG.endpoints.adminCatalog, query),
    );
  },

  getGiftcardCatalogItem(
    productId: string,
    query?: Pick<OpsGiftCardCatalogQuery, 'country'>,
  ): Promise<OpsGiftCardCatalogDetailResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<OpsGiftCardCatalogDetailResponse>(
        `${API_CONFIG.endpoints.adminCatalog}/${encodeURIComponent(productId)}`,
        query,
      ),
    );
  },

  listProviders(query: OpsProviderListQuery): Promise<OpsProviderListResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<OpsProviderListResponse>(API_CONFIG.endpoints.adminProviders, query),
    );
  },

  getProviderDetail(providerId: string): Promise<OpsProviderDetailResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<OpsProviderDetailResponse>(
        `${API_CONFIG.endpoints.adminProviders}/${encodeURIComponent(providerId)}`,
      ),
    );
  },

  syncProviders(): Promise<OpsSyncResponse> {
    return apiClient.post<OpsSyncResponse>(API_CONFIG.endpoints.adminProviderSync);
  },

  getSettings(): Promise<OpsSettingsResponse> {
    return apiClient.withRetry(() => apiClient.get<OpsSettingsResponse>(API_CONFIG.endpoints.adminSettings));
  },

  getSettingsDiagnostics(): Promise<OpsSettingsDiagnosticsResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<OpsSettingsDiagnosticsResponse>(API_CONFIG.endpoints.adminSettingsDiagnostics),
    );
  },

  createNote(request: OpsCreateNoteRequest): Promise<OpsNoteResponse> {
    return apiClient.post<OpsNoteResponse>(API_CONFIG.endpoints.adminNotes, request);
  },

  listSwaps(query: AdminSwapQuery): Promise<AdminSwapHistoryResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<AdminSwapHistoryResponse>(API_CONFIG.endpoints.adminSwaps, query),
    );
  },

  getSwap(id: string): Promise<SwapStatusResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<SwapStatusResponse>(
        `${API_CONFIG.endpoints.adminSwapDetail}/${encodeURIComponent(id)}`,
      ),
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
