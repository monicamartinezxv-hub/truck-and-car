import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { one } from './db';

const COOKIE_NAME = 'tc_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type Role = 'admin' | 'admin2' | 'user';

export type SessionUser = {
  username: string;
  role: Role;
  label: string;
};

type UserRow = {
  username: string;
  password_hash: string;
  role: Role;
  label: string;
};

function secret(): string {
  return process.env.AUTH_SECRET || 'truck-and-car-dev-secret';
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const derived = crypto.scryptSync(password, salt, expected.length);
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

export async function authenticate(
  username: string,
  password: string,
): Promise<SessionUser | null> {
  const user = await one<UserRow>(
    'SELECT username, password_hash, role, label FROM users WHERE lower(username) = lower($1)',
    [username.trim()],
  );
  if (!user || !verifyPassword(password, user.password_hash)) return null;
  return { username: user.username, role: user.role, label: user.label };
}

export async function createSession(user: SessionUser): Promise<void> {
  const payload = Buffer.from(
    JSON.stringify({ ...user, exp: Date.now() + MAX_AGE_SECONDS * 1000 }),
  ).toString('base64url');
  const store = await cookies();
  store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (expected.length !== signature.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionUser & {
      exp: number;
    };
    if (!data.exp || data.exp < Date.now()) return null;
    return { username: data.username, role: data.role, label: data.label };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireUser();
  if (session.role !== 'admin') redirect('/');
  return session;
}
