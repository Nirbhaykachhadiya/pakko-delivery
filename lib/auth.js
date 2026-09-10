import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const SECRET = process.env.JWT_SECRET;
const COOKIE = 'pakko_token';

export const hashPassword = (pw) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw, hash) => bcrypt.compare(pw, hash);

export function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    SECRET,
    { expiresIn: '30d' }
  );
}

export async function setAuthCookie(token) {
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAuthCookie() {
  const store = await cookies();
  store.delete(COOKIE);
}

// Returns { id, name, role } or null
export async function getCurrentUser() {
  try {
    const store = await cookies();
    const token = store.get(COOKIE)?.value;
    if (!token) return null;
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

export async function requireRole(role) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Not logged in', status: 401 };
  if (role && user.role !== role) return { error: 'Forbidden', status: 403 };
  return { user };
}
