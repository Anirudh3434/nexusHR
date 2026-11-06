import dotenv from 'dotenv';
import path from 'path';
import { AsyncLocalStorage } from 'node:async_hooks';

// Ensure environment variables are loaded (with quiet: true so stdout is pure JSON-RPC)
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

import connectDB from '../lib/mongodb';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../lib/auth';
import { hasPermission, Role, Module, Permission } from '../lib/permissions';

export type McpPermissionType = 'read' | 'write' | 'delete';

export interface UserContext {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId?: string;
  department?: string;
  designation?: string;
  // Granular token-level restrictions
  tokenPermissions: McpPermissionType[];
  allowedModules: string[];
}

export interface McpRequestContext {
  token?: string;
  userContext?: UserContext;
}

export const mcpContextStorage = new AsyncLocalStorage<McpRequestContext>();

/**
 * Resolves current user context from environment variables (token or email).
 */
export async function resolveUserContext(explicitUserOrToken?: string): Promise<UserContext> {
  const store = mcpContextStorage.getStore();
  if (store?.userContext) {
    return store.userContext;
  }

  await connectDB();

  const rawToken = explicitUserOrToken || 
    store?.token ||
    process.env.NEXUS_MCP_TOKEN || 
    process.env.NEXUS_AUTH_TOKEN || 
    process.env.NEXUSHR_TOKEN || 
    process.env.NEXUS_TOKEN;
    
  const email = process.env.NEXUSHR_USER_EMAIL || process.env.NEXUS_USER_EMAIL;

  // Granular env overrides if specified
  const envPermissions = process.env.NEXUS_PERMISSIONS 
    ? process.env.NEXUS_PERMISSIONS.split(',').map((p) => p.trim().toLowerCase() as McpPermissionType)
    : undefined;

  const envModules = process.env.NEXUS_MODULES
    ? process.env.NEXUS_MODULES.split(',').map((m) => m.trim().toLowerCase())
    : undefined;

  let tokenPermissions: McpPermissionType[] = envPermissions || ['read', 'write'];
  let allowedModules: string[] = envModules || ['tasks', 'attendance', 'leave', 'notices', 'employees'];

  // 1. Authenticate via Token if present (supports nx_mcp_ prefix or raw JWT)
  if (rawToken && !rawToken.includes('@')) {
    const cleanToken = rawToken.replace(/^nx_mcp_/, '');
    try {
      const decoded = jwt.verify(cleanToken, getJwtSecret()) as any;
      if (decoded && decoded.id) {
        if (decoded.mcpScopes) {
          if (Array.isArray(decoded.mcpScopes.permissions)) {
            tokenPermissions = decoded.mcpScopes.permissions.map((p: string) => p.toLowerCase() as McpPermissionType);
          }
          if (Array.isArray(decoded.mcpScopes.modules)) {
            allowedModules = decoded.mcpScopes.modules.map((m: string) => m.toLowerCase());
          }
        }

        const dbUser = await User.findById(decoded.id).select('-password').lean() as any;
        if (dbUser) {
          return {
            id: dbUser._id.toString(),
            name: dbUser.name,
            email: dbUser.email,
            role: (dbUser.role || 'employee') as Role,
            companyId: dbUser.companyId?.toString(),
            department: dbUser.department,
            designation: dbUser.designation,
            tokenPermissions,
            allowedModules,
          };
        }
      }
    } catch (e: any) {
      if (!rawToken.startsWith('nx_mcp_live_')) {
        console.error('[MCP Auth] Invalid token provided, falling back to email or default admin:', e.message);
      }
    }
  }

  // 2. Authenticate via User Email if present
  const targetEmail = (explicitUserOrToken && explicitUserOrToken.includes('@')) ? explicitUserOrToken : email;
  if (targetEmail) {
    const dbUser = await User.findOne({ email: targetEmail.toLowerCase().trim() }).select('-password').lean() as any;
    if (dbUser) {
      return {
        id: dbUser._id.toString(),
        name: dbUser.name,
        email: dbUser.email,
        role: (dbUser.role || 'employee') as Role,
        companyId: dbUser.companyId?.toString(),
        department: dbUser.department,
        designation: dbUser.designation,
        tokenPermissions,
        allowedModules,
      };
    }
    console.warn(`[MCP Auth] User with email "${targetEmail}" not found. Falling back to default active user.`);
  }

  // 3. Fallback: Find the first active admin or employee
  const fallbackUser = await User.findOne({ isActive: true }).sort({ role: 1, createdAt: 1 }).select('-password').lean() as any;
  if (!fallbackUser) {
    throw new Error('No active users found in database. Please register an employee or admin first.');
  }

  return {
    id: fallbackUser._id.toString(),
    name: fallbackUser.name,
    email: fallbackUser.email,
    role: (fallbackUser.role || 'employee') as Role,
    companyId: fallbackUser.companyId?.toString(),
    department: fallbackUser.department,
    designation: fallbackUser.designation,
    tokenPermissions,
    allowedModules,
  };
}

/**
 * Validates whether the user has sufficient permissions to perform the requested action on the module,
 * checking token-level scopes (read, write, delete) and module allowances as well as role permissions.
 */
export function checkPermission(
  user: UserContext,
  module: Module,
  permission: Permission
): { allowed: boolean; error?: string } {
  // 1. Check if module is allowed in token scopes
  if (user.allowedModules && user.allowedModules.length > 0) {
    const isModAllowed = user.allowedModules.some(
      (m) => module.toLowerCase().includes(m) || m.includes(module.toLowerCase())
    );
    if (!isModAllowed) {
      return {
        allowed: false,
        error: `Blocked by MCP Token: Function module "${module}" is not enabled in your authorized MCP scopes [${user.allowedModules.join(', ')}].`,
      };
    }
  }

  // 2. Check Read / Write / Delete permission in token scopes
  if (user.tokenPermissions && user.tokenPermissions.length > 0) {
    const requiredType: McpPermissionType = 
      permission === 'view' ? 'read' : 
      permission === 'delete' ? 'delete' : 
      'write';

    if (!user.tokenPermissions.includes(requiredType)) {
      return {
        allowed: false,
        error: `Blocked by MCP Token: Action "${permission}" requires "${requiredType}" permission, which is not granted on this token [${user.tokenPermissions.join(', ')}].`,
      };
    }
  }

  // 3. Check role-level permission in NexusHR matrix
  const allowed = hasPermission(user.role, module, permission);
  if (!allowed) {
    return {
      allowed: false,
      error: `Permission Denied: User "${user.name}" with role "${user.role}" does not have "${permission}" permission for module "${module}".`,
    };
  }

  return { allowed: true };
}
