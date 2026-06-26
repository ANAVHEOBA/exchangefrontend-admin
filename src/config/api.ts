const apiBaseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const API_CONFIG = {
  baseURL: apiBaseURL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  endpoints: {
    adminLogin: '/admin/login',
    adminOverview: '/admin/overview',
    adminSwaps: '/admin/swaps',
    adminSwapDetail: '/admin/swaps',
    adminSwapExport: '/admin/swaps/export',
    adminWhatsappConversations: '/admin/whatsapp/conversations',
  },
} as const;

export default API_CONFIG;
