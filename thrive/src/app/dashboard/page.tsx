/** Role dispatcher — sends each signed-in user to their own dashboard (FR-53). */

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { homeRouteFor } from '@/lib/rbac';

export default async function DashboardRedirect() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard');
  redirect(homeRouteFor(user.role));
}
