/**
 * GET /api/documents/[id]/download
 * FR-31, NFR-08: uploaded files are never publicly addressable — every read
 * passes an authorization check and is written to the audit trail.
 */

import { prisma } from '@/lib/prisma';
import { handler, fail, requireUser } from '@/lib/api';
import { resolveThesisAccess } from '@/lib/access';
import { readDocument } from '@/lib/storage';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';

export const GET = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await context.params;

  const document = await prisma.document.findUnique({
    where: { id },
    select: {
      id: true,
      thesisId: true,
      fileName: true,
      storedName: true,
      mimeType: true,
      title: true,
      version: true,
      thesis: { select: { referenceNo: true } },
    },
  });
  if (!document) return fail('That document no longer exists.', 404);

  const access = await resolveThesisAccess(user, document.thesisId);
  if (!access.canView) return fail('You do not have access to this document.', 403);

  let bytes: Buffer;
  try {
    bytes = await readDocument(document.storedName);
  } catch {
    return fail('The stored file could not be retrieved. Please contact the administrator.', 502);
  }

  await recordAudit({
    actorId: user.id,
    action: AUDIT_ACTIONS.DOCUMENT_DOWNLOADED,
    entityType: 'Document',
    entityId: document.id,
    summary: `Downloaded ${document.title} (v${document.version}) from ${document.thesis.referenceNo}.`,
    ipAddress: clientIp(request),
  });

  const safeName = document.fileName.replace(/[^\w.\-]/g, '_');

  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': document.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': 'private, no-store',
    },
  });
});
