'use server';

import { redirect } from 'next/navigation';
import { authenticate, clearSession, createSession } from '@/lib/auth';

export async function loginAction(formData: FormData) {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!username || !password) redirect('/login?err=Usuario%20o%20contrase%C3%B1a%20incorrectos');

  const user = await authenticate(username, password);
  if (!user) redirect('/login?err=Usuario%20o%20contrase%C3%B1a%20incorrectos');

  await createSession(user);
  redirect('/');
}

export async function logoutAction() {
  await clearSession();
  redirect('/login');
}
