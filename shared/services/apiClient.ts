import { User, AuthenticatedResponse } from '../types';

const getBaseUrl = () => {
  // In a real app, this would come from an environment variable
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3000'; // Default for desktop development
};

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = getBaseUrl();
  }

  setToken(token: string) {
    this.token = token;
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = new Headers(options.headers || {});
    
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }
    
    headers.set('Content-Type', 'application/json');

    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'API Request failed' }));
      throw new Error(error.message || 'Unknown error');
    }
    
    return response.json();
  }

  async login(email: string, password: string): Promise<AuthenticatedResponse> {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (data.token) {
      this.setToken(data.token);
    }
    
    return data;
  }
}

export const apiClient = new ApiClient();
