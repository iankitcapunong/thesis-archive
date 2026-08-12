/** Role and permission matrix (SRS Appendix Table 6.1, FR-10). */

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { permissionMatrix, PERMISSIONS, type Permission } from '@/lib/rbac';
import { Card, CardHeader, PageHeader } from '@/components/ui';
import { ALL_ROLES, ROLE_LABELS, type Role } from '@/lib/constants';

export const metadata: Metadata = { title: 'Roles & Permissions' };

const GROUPS: { heading: string; prefix: string }[] = [
  { heading: 'System access', prefix: 'auth.' },
  { heading: 'User & access management', prefix: 'users.' },
  { heading: 'Thesis management', prefix: 'thesis.' },
  { heading: 'Adviser & panel', prefix: 'adviser.' },
  { heading: 'Panel assignment', prefix: 'panel.' },
  { heading: 'Documents', prefix: 'document.' },
  { heading: 'Evaluation & workflow', prefix: 'evaluation.' },
  { heading: 'Workflow control', prefix: 'workflow.' },
  { heading: 'Defense scheduling', prefix: 'defense.' },
  { heading: 'Analytics & reporting', prefix: 'analytics.' },
  { heading: 'Reports', prefix: 'reports.' },
  { heading: 'Archive', prefix: 'archive.' },
  { heading: 'Audit', prefix: 'audit.' },
];

export default async function RolesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/unauthorized');

  const matrix = permissionMatrix();
  const allPermissions = Object.keys(PERMISSIONS) as Permission[];

  return (
    <>
      <PageHeader
        title="Roles and permissions"
        description="The authoritative capability matrix. Every privileged API route checks this matrix server-side before acting, and record-level scope is applied on top of it."
      />

      <Card>
        <CardHeader title="Permission matrix" />
        <div className="table-wrap">
          <table className="table min-w-[900px]">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white">Capability</th>
                {ALL_ROLES.map((role) => (
                  <th key={role} className="text-center">
                    {ROLE_LABELS[role as Role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((group) => {
                const permissions = allPermissions.filter((p) => p.startsWith(group.prefix));
                if (permissions.length === 0) return null;

                return (
                  <>
                    <tr key={group.heading} className="bg-slate-50">
                      <td colSpan={ALL_ROLES.length + 1} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {group.heading}
                      </td>
                    </tr>
                    {permissions.map((permission) => (
                      <tr key={permission}>
                        <td className="sticky left-0 bg-white text-sm">{PERMISSIONS[permission]}</td>
                        {ALL_ROLES.map((role) => {
                          const granted = matrix[role as Role]?.includes(permission);
                          return (
                            <td key={role} className="text-center">
                              <span
                                className={granted ? 'text-csu-600' : 'text-slate-300'}
                                aria-label={granted ? 'Permitted' : 'Not permitted'}
                              >
                                {granted ? '✔' : '✖'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Note on the SRS appendix" />
        <div className="space-y-2 p-5 text-sm text-slate-600">
          <p>
            SRS Appendix Table 6.1 lists &quot;Create User Account&quot; and &quot;Activate / Deactivate Accounts&quot;
            as available to every role. That conflicts with FR-06, FR-16 and FR-17, which reserve these actions for
            authorized administrators.
          </p>
          <p>
            The implementation follows the functional requirements: account creation is limited to administrators and
            research coordinators (coordinators may onboard students and faculty only), and activation or deactivation
            is limited to administrators.
          </p>
        </div>
      </Card>
    </>
  );
}
