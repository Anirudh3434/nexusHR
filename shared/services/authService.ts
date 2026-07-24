import { apiClient } from './apiClient';
import { User, AuthenticatedResponse } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<AuthenticatedResponse> {
    try {
      const response = await apiClient.login(email, password);
      // On web, cookies are handled by the browser. 
      // On native, tokens will be manually attached by the apiClient from its internal state.
      return response;
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  },

  async getCurrentUser(headers?: Record<string, string>): Promise<User> {
    return apiClient.request('/api/auth/me', { headers });
  },

  logout() {
    // Logic to clear tokens/cookies
    // apiClient.setToken(null); 
  }
};
