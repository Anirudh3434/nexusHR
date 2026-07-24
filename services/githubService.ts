import axios from 'axios';

export interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GitHubAccessTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  html_url: string;
  private: boolean;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
}

export interface GitHubWebhookPayload {
  ref: string;
  ref_type: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
  };
  sender: {
    login: string;
    id: number;
  };
}

class GitHubService {
  private config: GitHubOAuthConfig;

  constructor() {
    this.config = {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/github/callback',
    };
  }

  getAuthUrl(): string {
    const scopes = ['repo', 'read:org', 'admin:repo_hook'];
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: scopes.join(' '),
      state: this.generateState(),
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<GitHubAccessTokenResponse> {
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code: code,
      redirect_uri: this.config.redirectUri,
    }, {
      headers: {
        Accept: 'application/json',
      },
    });

    return response.data;
  }

  async getUserInfo(accessToken: string): Promise<GitHubUser> {
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    return response.data;
  }

  async getUserRepos(accessToken: string): Promise<GitHubRepo[]> {
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      params: {
        sort: 'updated',
        per_page: 100,
      },
    });

    return response.data;
  }

  async getOrgRepos(accessToken: string, org: string): Promise<GitHubRepo[]> {
    const response = await axios.get(`https://api.github.com/orgs/${org}/repos`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      params: {
        sort: 'updated',
        per_page: 100,
      },
    });

    return response.data;
  }

  async createWebhook(accessToken: string, owner: string, repo: string, webhookUrl: string): Promise<any> {
    const response = await axios.post(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
      name: 'web',
      active: true,
      events: ['create', 'delete'],
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret: process.env.GITHUB_WEBHOOK_SECRET,
      },
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    return response.data;
  }

  async getBranches(accessToken: string, owner: string, repo: string): Promise<GitHubBranch[]> {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/branches`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      params: {
        per_page: 100,
      },
    });

    return response.data;
  }

  parseTicketNumberFromBranch(branchName: string): string | null {
    // Common patterns: TASK-123, #123, task-123, 123
    const patterns = [
      /([A-Z]+-\d+)/i,           // TASK-123, PROJ-456
      /#(\d+)/,                   // #123
      /(\d{3,})/,                 // 123 (at least 3 digits)
    ];

    for (const pattern of patterns) {
      const match = branchName.match(pattern);
      if (match) {
        return match[1].toUpperCase();
      }
    }

    return null;
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    
    if (!secret) {
      console.error('GITHUB_WEBHOOK_SECRET not configured');
      return false;
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payload).digest('hex');
    const expectedSignature = `sha256=${digest}`;

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

export default new GitHubService();
