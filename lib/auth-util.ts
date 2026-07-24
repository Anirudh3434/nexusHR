import jwt from 'jsonwebtoken';
import { headers } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-123';

export interface AuthInfo {
  userId: string;
  role: string;
  companyId?: string;
  email?: string;
}

export async function getAuthInfo(): Promise<AuthInfo | null> {
  try {
    const headersList = await headers();
    
    // 1. Try middleware headers (Web/Cookie-based)
    const headerUserId = headersList.get('x-user-id');
    if (headerUserId) {
      return {
        userId: headerUserId,
        role: headersList.get('x-user-role') || 'employee',
        companyId: headersList.get('x-company-id') || undefined,
        email: headersList.get('x-user-email') || undefined
      };
    }

    // 2. Try Authorization header (Mobile/Token-based)
    const authHeader = headersList.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      if (decoded && decoded.id) {
        return {
          userId: decoded.id,
          role: decoded.role || 'employee',
          companyId: decoded.companyId, // Fallback if encoded in JWT
          email: decoded.email
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Auth Utility Error:', error);
    return null;
  }
}
