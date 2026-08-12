/**
 * In-app notifications (FR-49 to FR-52).
 * Recipients are resolved from the thesis relationship graph so that each user
 * only receives notices tied to their own role and records (FR-52).
 */

import 'server-only';
import { prisma } from './prisma';

export type NotifyInput = {
  userIds: string[];
  category: string;
  title: string;
  body: string;
  link?: string;
};

export async function notify({ userIds, category, title, body, link }: NotifyInput): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return;

  try {
    await prisma.notification.createMany({
      data: unique.map((userId) => ({ userId, category, title, body, link: link ?? null })),
    });
  } catch (error) {
    // A failed notification must never roll back the academic action itself.
    console.error('[notifications] delivery failed', error);
  }
}

/** All users attached to a thesis: members, adviser and panel. */
export async function thesisAudience(
  thesisId: string,
  opts: { members?: boolean; adviser?: boolean; panel?: boolean } = {},
): Promise<string[]> {
  const { members = true, adviser = true, panel = false } = opts;

  const thesis = await prisma.thesisProject.findUnique({
    where: { id: thesisId },
    select: {
      adviserId: true,
      members: { select: { userId: true } },
      panel: { select: { panelistId: true } },
    },
  });
  if (!thesis) return [];

  const ids: string[] = [];
  if (members) ids.push(...thesis.members.map((m) => m.userId));
  if (adviser && thesis.adviserId) ids.push(thesis.adviserId);
  if (panel) ids.push(...thesis.panel.map((p) => p.panelistId));
  return [...new Set(ids)];
}
