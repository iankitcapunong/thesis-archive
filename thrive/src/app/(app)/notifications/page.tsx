/** Notification centre — FR-50, FR-52. */

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader, Card } from '@/components/ui';
import { NotificationList } from './notification-list';

export const metadata: Metadata = { title: 'Notifications' };
export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Submissions, evaluations, adviser responses, schedule changes and workflow updates related to your role."
      />

      <Card>
        <NotificationList
          initial={notifications.map((n) => ({
            id: n.id,
            category: n.category,
            title: n.title,
            body: n.body,
            link: n.link,
            read: Boolean(n.readAt),
            createdAt: n.createdAt.toISOString(),
          }))}
        />
      </Card>
    </>
  );
}
