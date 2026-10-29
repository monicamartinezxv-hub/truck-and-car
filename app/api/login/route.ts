import { redirect } from 'next/navigation';
import { authenticate, createSession } from '@/lib/auth';

const INVALID = '/login?err=Usuario%20o%20contrase%C3%B1a%20incorrectos';

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!username || !password) redirect(INVALID);

  const user = await authenticate(username, password);
  if (!user) redirect(INVALID);

  await createSession(user);
  redirect('/');
}
