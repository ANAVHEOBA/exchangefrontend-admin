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
    adminLogin: '/ops/login',
    adminDashboard: '/ops/dashboard',
    adminOverview: '/ops/overview',
    adminSearch: '/ops/search',
    adminHealth: '/ops/health',
    adminFinance: '/ops/finance/summary',
    adminWebhooks: '/ops/webhooks',
    adminNotes: '/ops/notes',
    adminSwaps: '/swap/ops',
    adminSwapDetail: '/swap/ops',
    adminSwapExport: '/ops/swaps/export',
    adminGiftcardOrders: '/giftcards/ops/orders',
    adminWhatsappConversations: '/whatsapp/ops/conversations',
  },
} as const;

export default API_CONFIG;
