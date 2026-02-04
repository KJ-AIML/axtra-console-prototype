/**
 * Authentication Service
 * Handles user registration, login, logout, and session management
 */

import { db } from './db';
import { seedUserDashboardData } from './dashboard';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: number; // seconds
}

// Password hashing
const SALT_ROUNDS = 10;
const SESSION_EXPIRY_DAYS = 7;

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate initials from name
 */
export function generateInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Register a new user
 */
export async function registerUser(data: RegisterRequest): Promise<AuthResponse> {
  // Check if user already exists
  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [data.email],
  });
  
  if (existing.rows.length > 0) {
    throw new Error('User with this email already exists');
  }
  
  // Create user
  const userId = randomUUID();
  const passwordHash = await hashPassword(data.password);
  const initials = generateInitials(data.name);
  const now = new Date().toISOString();
  
  await db.execute({
    sql: `
      INSERT INTO users (id, email, password_hash, name, initials, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [userId, data.email, passwordHash, data.name, initials, 'operator', now, now],
  });
  
  // Create default account for user
  const accountId = randomUUID();
  await db.execute({
    sql: `
      INSERT INTO accounts (id, user_id, account_name, account_type, settings, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [accountId, userId, 'Default Account', 'personal', '{}', now, now],
  });

  // Seed dashboard data for new user
  await seedUserDashboardData(userId);
  
  // Create session
  const { token, expiresAt } = await createSession(userId);
  
  const user: User = {
    id: userId,
    email: data.email,
    name: data.name,
    initials,
    role: 'operator',
    createdAt: now,
    updatedAt: now,
  };
  
  return {
    user,
    token,
    expiresIn: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
  };
}

/**
 * Login a user
 */
export async function loginUser(data: LoginRequest): Promise<AuthResponse> {
  // Find user by email
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [data.email],
  });
  
  if (result.rows.length === 0) {
    throw new Error('Invalid email or password');
  }
  
  const userRow = result.rows[0];
  const passwordHash = userRow.password_hash as string;
  
  // Verify password
  const isValid = await verifyPassword(data.password, passwordHash);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }
  
  const userId = userRow.id as string;
  
  // Create session
  const { token, expiresAt } = await createSession(userId);
  
  const user: User = {
    id: userId,
    email: userRow.email as string,
    name: userRow.name as string,
    initials: userRow.initials as string,
    role: userRow.role as string,
    avatar: userRow.avatar as string | undefined,
    createdAt: userRow.created_at as string,
    updatedAt: userRow.updated_at as string,
  };
  
  return {
    user,
    token,
    expiresIn: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
  };
}

/**
 * Create a new session
 */
async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const sessionId = randomUUID();
  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);
  
  await db.execute({
    sql: `
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `,
    args: [sessionId, userId, token, expiresAt.toISOString()],
  });
  
  return { token, expiresAt };
}

/**
 * Validate a session token
 */
export async function validateSession(token: string): Promise<User | null> {
  const result = await db.execute({
    sql: `
      SELECT s.user_id, s.expires_at, u.*
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ?
    `,
    args: [token],
  });
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  const expiresAt = new Date(row.expires_at as string);
  
  // Check if session is expired
  if (expiresAt < new Date()) {
    // Delete expired session
    await db.execute({
      sql: 'DELETE FROM sessions WHERE token = ?',
      args: [token],
    });
    return null;
  }
  
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    initials: row.initials as string,
    role: row.role as string,
    avatar: row.avatar as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Logout a user (delete session)
 */
export async function logoutUser(token: string): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM sessions WHERE token = ?',
    args: [token],
  });
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [userId],
  });
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    initials: row.initials as string,
    role: row.role as string,
    avatar: row.avatar as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Get user's accounts
 */
export async function getUserAccounts(userId: string): Promise<any[]> {
  const result = await db.execute({
    sql: 'SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at ASC',
    args: [userId],
  });
  
  return result.rows.map(row => ({
    id: row.id as string,
    userId: row.user_id as string,
    accountName: row.account_name as string,
    accountType: row.account_type as string,
    settings: JSON.parse((row.settings as string) || '{}'),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

/**
 * Create a seed user for testing (if no users exist)
 * Also ensures dashboard data exists for the admin user
 */
export async function seedInitialUser(): Promise<void> {
  const result = await db.execute('SELECT COUNT(*) as count FROM users');
  const count = (result.rows[0].count as number) || 0;
  
  if (count === 0) {
    console.log('🌱 Creating initial seed user...');
    
    try {
      await registerUser({
        email: 'admin@axtra.local',
        password: 'admin123',
        name: 'Admin User',
      });
      
      console.log('✅ Seed user created with dashboard data:');
      console.log('   Email: admin@axtra.local');
      console.log('   Password: admin123');
    } catch (error) {
      console.error('Failed to create seed user:', error);
    }
  } else {
    // Check if admin user exists but is missing dashboard data
    // (for existing databases before dashboard feature was added)
    const adminResult = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: ['admin@axtra.local'],
    });
    
    if (adminResult.rows.length > 0) {
      const adminId = adminResult.rows[0].id as string;
      
      // Check if user has metrics
      const metricsResult = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM user_metrics WHERE user_id = ?',
        args: [adminId],
      });
      
      const metricsCount = (metricsResult.rows[0].count as number) || 0;
      
      if (metricsCount === 0) {
        console.log('🌱 Adding dashboard data to existing admin user...');
        await seedUserDashboardData(adminId);
        console.log('✅ Dashboard data added to admin user');
      }
    }
  }
}
