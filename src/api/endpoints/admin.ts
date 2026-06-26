import { apiClient } from '../client';
import { API_CONFIG } from '~/config/api';
import type {
  AdminConversationDetailResponse,
  AdminConversationListResponse,
  AdminConversationQuery,
  AdminLoginRequest,
  AdminLoginResponse,
  AdminOverviewResponse,
  AdminSwapExportQuery,
  AdminSwapHistoryResponse,
  AdminSwapQuery,
  StoredAdminSession,
  SwapStatusResponse,
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

  getOverview(): Promise<AdminOverviewResponse> {
    return apiClient.withRetry(() => apiClient.get<AdminOverviewResponse>(API_CONFIG.endpoints.adminOverview));
  },

  listSwaps(query: AdminSwapQuery): Promise<AdminSwapHistoryResponse> {
    return apiClient.withRetry(() => apiClient.get<AdminSwapHistoryResponse>(API_CONFIG.endpoints.adminSwaps, query));
  },

  getSwap(id: string): Promise<SwapStatusResponse> {
    return apiClient.withRetry(() =>
      apiClient.get<SwapStatusResponse>(`${API_CONFIG.endpoints.adminSwapDetail}/${encodeURIComponent(id)}`),
    );
  },

  exportSwapsCsv(query: AdminSwapExportQuery): Promise<Blob> {
    return apiClient.download(API_CONFIG.endpoints.adminSwapExport, query);
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
