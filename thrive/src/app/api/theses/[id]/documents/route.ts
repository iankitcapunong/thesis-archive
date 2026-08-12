/**
 * POST /api/theses/[id]/documents
 * FR-29 to FR-34: milestone-scoped upload, validation, versioned resubmission.
 */

import { prisma } from '@/lib/prisma';
import { handler, ok, fail, requireUser, ApiError } from '@/lib/api';
import { resolveThesisAccess } from '@/lib/access';
import { findRequirement } from '@/lib/workflow';
import { validateUpload, saveDocument, deleteDocument } from '@/lib/storage';
import { notify, thesisAudience } from '@/lib/notifications';
import { recordAudit, clientIp, AUDIT_ACTIONS } from '@/lib/audit';
import { DOCUMENT_STATUS, NOTIFICATION_CATEGORY } from '@/lib/constants';

export const POST = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id: thesisId } = await context.params;

  const access = await resolveThesisAccess(user, thesisId);
  if (!access.canUpload) {
    return fail('Only members of this thesis group may submit documents.', 403);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new ApiError('The upload could not be read. Please try again.', 400);
  }

  const file = form.get('file');
  const requirementKey = String(form.get('requirementKey') ?? '');
  const note = String(form.get('note') ?? '').slice(0, 500);

  if (!(file instanceof File)) return fail('Select a file to upload.', 422);
  if (!requirementKey) return fail('Select which requirement this document fulfils.', 422);

  const thesis = await prisma.thesisProject.findUnique({
    where: { id: thesisId },
    select: { id: true, referenceNo: true, currentStage: true, status: true, adviserId: true },
  });
  if (!thesis) return fail('That thesis record no longer exists.', 404);

  if (thesis.status === 'ARCHIVED' || thesis.status === 'COMPLETED') {
    return fail('This thesis has been completed. No further submissions are accepted.', 409);
  }

  // FR-30: submissions belong to the requirement set of the *current* stage.
  const requirement = findRequirement(thesis.currentStage, requirementKey);
  if (!requirement) {
    return fail('That requirement does not belong to the current thesis stage.', 422);
  }

  // FR-34: validate type and size before anything is written to disk.
  const validation = validateUpload({ name: file.name, size: file.size, type: file.type });
  if (!validation.ok) return fail(validation.message, 422);

  const milestone = await prisma.milestone.findUnique({
    where: { thesisId_stageKey: { thesisId, stageKey: thesis.currentStage } },
    select: { id: true, status: true },
  });
  if (!milestone) return fail('The milestone for this stage could not be found.', 409);
  if (milestone.status === 'APPROVED') {
    return fail('This milestone has already been approved and is closed for submissions.', 409);
  }

  // FR-33: a resubmission supersedes the previous version rather than replacing it.
  const previous = await prisma.document.findFirst({
    where: { thesisId, requirementKey, isCurrent: true },
    orderBy: { version: 'desc' },
  });

  if (previous?.status === DOCUMENT_STATUS.APPROVED) {
    return fail('This requirement has already been approved. Contact your adviser if it must be replaced.', 409);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const stored = await saveDocument(file.name, bytes);

  try {
    const document = await prisma.$transaction(async (tx) => {
      if (previous) {
        await tx.document.update({ where: { id: previous.id }, data: { isCurrent: false } });
      }
      return tx.document.create({
        data: {
          thesisId,
          milestoneId: milestone.id,
          requirementKey,
          title: requirement.label,
          fileName: file.name,
          storedName: stored.storedName,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: stored.sizeBytes,
          checksum: stored.checksum,
          version: (previous?.version ?? 0) + 1,
          status: DOCUMENT_STATUS.UNDER_REVIEW,
          uploadedById: user.id,
        },
        select: { id: true, title: true, version: true, status: true, createdAt: true },
      });
    });

    // FR-32: submitting moves the milestone out of a plain in-progress state.
    if (milestone.status === 'LOCKED' || milestone.status === 'IN_PROGRESS') {
      await prisma.milestone.update({
        where: { id: milestone.id },
        data: { status: 'SUBMITTED', submittedAt: new Date() },
      });
    }

    // FR-51: the adviser is told there is something waiting.
    const audience = await thesisAudience(thesisId, { members: false, adviser: true });
    await notify({
      userIds: audience,
      category: NOTIFICATION_CATEGORY.SUBMISSION,
      title: 'Document awaiting review',
      body: `${user.firstName} ${user.lastName} submitted ${requirement.label} (v${document.version}) for ${thesis.referenceNo}.`,
      link: `/theses/${thesisId}`,
    });

    await recordAudit({
      actorId: user.id,
      action: AUDIT_ACTIONS.DOCUMENT_UPLOADED,
      entityType: 'Document',
      entityId: document.id,
      summary: `Uploaded ${requirement.label} (v${document.version}) to ${thesis.referenceNo}.`,
      metadata: { thesisId, requirementKey, sizeBytes: stored.sizeBytes, note: note || undefined },
      ipAddress: clientIp(request),
    });

    return ok(
      {
        document,
        message:
          document.version > 1
            ? `Revision v${document.version} submitted. Your adviser has been notified.`
            : 'Document submitted. Your adviser has been notified.',
      },
      201,
    );
  } catch (error) {
    // Never leave an orphaned file behind if the database write fails (FR-66).
    await deleteDocument(stored.storedName);
    throw error;
  }
});
