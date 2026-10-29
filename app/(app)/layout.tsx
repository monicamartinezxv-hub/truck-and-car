import { requireUser } from '@/lib/auth';
import { visibleNav } from '@/lib/nav';
import Sidebar from '@/components/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const items = visibleNav(user.username, user.role);

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar user={user} items={items} />
      <main className="min-w-0 flex-1 px-4 py-5 lg:px-8 lg:py-7">{children}</main>
    </div>
  );
}
