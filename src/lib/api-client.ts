/**
 * API Client — Fetch wrapper for client-side API calls
 */

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = typeof window !== 'undefined' ? '' : process.env.NEXT_PUBLIC_APP_URL || '';
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string; details?: string }> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add auth token if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, { ...options, headers });
    const json = await response.json();

    if (!response.ok) {
      return { success: false, error: json.error, details: json.details };
    }

    return { success: true, data: json.data ?? json };
  }

  async get<T>(path: string): Promise<{ success: boolean; data?: T; error?: string }> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body: unknown): Promise<{ success: boolean; data?: T; error?: string }> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}

export const apiClient = new ApiClient();
