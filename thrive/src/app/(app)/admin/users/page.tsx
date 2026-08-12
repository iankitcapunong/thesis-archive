/** User and access management — FR-14 to FR-18. */

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/rbac';
import { PageHeader, Card, CardHeader, EmptyState, StatusPill, formatDate } from '@/components/ui';
import { UserRow } from './user-row';
import { CreateUserPanel } from './create-user';
import { ALL_ROLES, ROLE_LABELS, USER_STATUS, type Role } from '@/lib/constants';

export const metadata: Metadata = { title: 'User Management' };
export const dynamic = 'force-dynamic';

export default async function UserManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; role?: string; status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!can(user.role, 'users.view')) redirect('/unauthorized');

  const params = await searchParams;
  const where: Record<string, unknown> = {};

  if (user.role === 'DEPARTMENT_CHAIR' && user.department) where.department = user.department;
  else if (user.role === 'COLLEGE_ADMIN') where.college = user.college;

  if (params.role) where.role = params.role;
  if (params.status) where.status = params.status;
  if (params.query) {
    where.OR = [
      { firstName: { contains: params.query } },
      { lastName: { contains: params.query } },
      { email: { contains: params.query } },
      { schoolId: { contains: params.query } },
    ];
  }

  const accounts = await prisma.user.findMany({
    where,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    take: 200,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      status: true,
      schoolId: true,
      department: true,
      lastLoginAt: true,
    },
  });

  const canModify = can(user.role, 'users.assignRole') || can(user.role, 'users.setStatus');

  return (
    <>
      <PageHeader
        title="User management"
        description="Search accounts, adjust roles and control access. Role and status changes require explicit confirmation and are written to the audit trail."
      />

      {can(user.role, 'users.create') && (
        <div className="mb-6">
          <CreateUserPanel actorRole={user.role} defaultDepartment={user.department ?? ''} />
        </div>
      )}

      <Card>
        <CardHeader title={`${accounts.length} account${accounts.length === 1 ? '' : 's'}`} />

        {/* Two columns at tablet width, one row only once there is room for it. */}
        <form className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
          <input
            type="search"
            name="query"
            defaultValue={params.query ?? ''}
            placeholder="Search by name, email or ID number"
            className="field-input sm:col-span-2 lg:col-span-1"
            aria-label="Search users"
          />
          <select name="role" defaultValue={params.role ?? ''} className="field-input" aria-label="Filter by role">
            <option value="">All roles</option>
            {ALL_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role as Role]}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={params.status ?? ''} className="field-input" aria-label="Filter by status">
            <option value="">All statuses</option>
            {Object.values(USER_STATUS).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary">
            Apply
          </button>
        </form>

        {accounts.length === 0 ? (
          <EmptyState title="No accounts match your filters" description="Adjust the search terms or clear the filters." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>ID</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last sign-in</th>
                  {canModify && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <UserRow
                    key={account.id}
                    account={{
                      id: account.id,
                      name: `${account.firstName} ${account.lastName}`,
                      email: account.email,
                      schoolId: account.schoolId,
                      role: account.role,
                      status: account.status,
                      lastLogin: account.lastLoginAt ? formatDate(account.lastLoginAt) : 'Never',
                    }}
                    canAssignRole={can(user.role, 'users.assignRole')}
                    canSetStatus={can(user.role, 'users.setStatus')}
                    isSelf={account.id === user.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {!canModify && (
        <p className="mt-4 text-xs text-slate-500">
          Your role has read-only access to the user directory. Role changes and account activation are reserved for
          administrators (FR-16, FR-17).
        </p>
      )}

      <p className="sr-only">
        {accounts.filter((a) => a.status !== 'ACTIVE').length} accounts are currently not active and cannot sign in.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
        <span>Legend:</span>
        <StatusPill status="ACTIVE" />
        <span>can sign in</span>
        <StatusPill status="INACTIVE" />
        <span>access denied even with valid credentials (FR-04)</span>
      </div>
    </>
  );
}
