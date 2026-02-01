

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  private async request(endpoint: string, options: RequestOptions = {}): Promise<Response> {
    const { skipAuth = false, ...fetchOptions } = options;
    
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    // Add auth header if not skipped and token is available
    if (!skipAuth) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    let response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // Handle 401 Unauthorized - try token refresh
    if (response.status === 401 && !skipAuth) {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        try {
          // Attempt to refresh the token
          const refreshResponse = await fetch(`${this.baseURL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: refreshToken })
          });

          if (refreshResponse.ok) {
            const authData = await refreshResponse.json();
            localStorage.setItem('accessToken', authData.accessToken);
            localStorage.setItem('refreshToken', authData.refreshToken);

            // Retry the original request with new token
            headers['Authorization'] = `Bearer ${authData.accessToken}`;
            response = await fetch(url, {
              ...fetchOptions,
              headers,
            });
          } else {
            // Refresh failed, clear tokens and redirect to login
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/auth';
            throw new Error('Session expired. Please login again.');
          }
        } catch {
          // Refresh failed, clear tokens
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/auth';
          throw new Error('Session expired. Please login again.');
        }
      }
    }

    return response;
  }

  async get<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.request(endpoint, { ...options, method: 'GET' });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  async post<T = unknown>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const response = await this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  async put<T = unknown>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const response = await this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  async delete<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.request(endpoint, { ...options, method: 'DELETE' });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  // Method for authentication endpoints that don't require auth headers
  async authRequest<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  // Method to get raw response (for text responses like from auth endpoints)
  async getRawResponse(endpoint: string, options: RequestOptions = {}): Promise<{ data: string; status: number; ok: boolean }> {
    const response = await this.request(endpoint, options);
    const data = await response.text();
    return {
      data,
      status: response.status,
      ok: response.ok,
    };
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Hook for using the API client with auth context
export function useApi() {
  return {
    get: apiClient.get.bind(apiClient),
    post: apiClient.post.bind(apiClient),
    put: apiClient.put.bind(apiClient),
    delete: apiClient.delete.bind(apiClient),
    authRequest: apiClient.authRequest.bind(apiClient),
    getRawResponse: apiClient.getRawResponse.bind(apiClient),
  };
}