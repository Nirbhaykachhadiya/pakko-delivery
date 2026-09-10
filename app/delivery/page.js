import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import DeliveryDashboard from './DeliveryDashboard';

export const dynamic = 'force-dynamic';

export default async function DeliveryPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'admin') redirect('/admin');

  return <DeliveryDashboard user={user} />;
}
