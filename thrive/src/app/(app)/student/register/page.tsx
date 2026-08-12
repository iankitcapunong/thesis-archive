/** Thesis registration (FR-19, FR-20). */

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader, Card, CardHeader } from '@/components/ui';
import { RegisterThesisForm } from './register-form';
import { STAGES } from '@/lib/workflow';

export const metadata: Metadata = { title: 'Register a thesis project' };
export const dynamic = 'force-dynamic';

export default async function RegisterThesisPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'STUDENT') redirect('/unauthorized');

  const existing = await prisma.thesisMember.findFirst({
    where: { userId: user.id, thesis: { status: { in: ['ACTIVE', 'DRAFT'] } } },
    include: { thesis: { select: { id: true } } },
  });
  if (existing) redirect(`/theses/${existing.thesis.id}`);

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { program: true, department: true },
  });

  return (
    <>
      <PageHeader
        title="Register a thesis project"
        description="Registration creates your milestone plan and opens the proposal development stage. Titles and abstracts can still be refined afterwards."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Project details" />
          <div className="p-5">
            <RegisterThesisForm
              defaultProgram={profile?.program ?? ''}
              defaultDepartment={profile?.department ?? ''}
            />
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader title="What happens next" />
          <ol className="space-y-4 p-5">
            {STAGES.map((stage) => (
              <li key={stage.key} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  {stage.sequence}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-800">{stage.name}</p>
                  <p className="text-xs leading-relaxed text-slate-500">{stage.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
