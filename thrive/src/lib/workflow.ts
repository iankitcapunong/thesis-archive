/**
 * Thesis workflow definition and progression rules
 * (FR-40 to FR-45, SRS 4.5.4 Data Flow and Lifecycle).
 *
 * The stage list and per-stage document requirements are declarative so that
 * institutional policy changes stay confined to this file (NFR-20).
 */

export type StageKey =
  | 'PROPOSAL_DEVELOPMENT'
  | 'PROPOSAL_DEFENSE'
  | 'REVISION'
  | 'FINAL_DEVELOPMENT'
  | 'FINAL_DEFENSE'
  | 'COMPLETED';

export type DocumentRequirement = {
  key: string;
  label: string;
  description: string;
  /** A milestone cannot be approved while a required document is unapproved. */
  required: boolean;
};

export type StageDefinition = {
  key: StageKey;
  name: string;
  sequence: number;
  description: string;
  /** Stage requires a scheduled+completed defense before it can be approved. */
  defenseType?: 'PROPOSAL' | 'FINAL';
  requirements: DocumentRequirement[];
};

export const STAGES: StageDefinition[] = [
  {
    key: 'PROPOSAL_DEVELOPMENT',
    name: 'Proposal Development',
    sequence: 1,
    description:
      'Group develops Chapters 1-3 under adviser supervision and secures endorsement for proposal defense.',
    requirements: [
      {
        key: 'PROPOSAL_MANUSCRIPT',
        label: 'Proposal Manuscript (Chapters 1-3)',
        description: 'Introduction, Review of Related Literature, and Methodology.',
        required: true,
      },
      {
        key: 'ADVISER_ENDORSEMENT',
        label: 'Adviser Endorsement Form',
        description: 'Signed endorsement certifying readiness for proposal defense.',
        required: true,
      },
    ],
  },
  {
    key: 'PROPOSAL_DEFENSE',
    name: 'Proposal Defense',
    sequence: 2,
    description: 'Proposal is presented to and evaluated by the assigned defense panel.',
    defenseType: 'PROPOSAL',
    requirements: [
      {
        key: 'PROPOSAL_PRESENTATION',
        label: 'Defense Presentation Deck',
        description: 'Slide deck used during the proposal defense.',
        required: true,
      },
      {
        key: 'PROPOSAL_DEFENSE_FORM',
        label: 'Proposal Defense Result Form',
        description: 'Panel decision sheet recording the defense outcome.',
        required: true,
      },
    ],
  },
  {
    key: 'REVISION',
    name: 'Post-Defense Revision',
    sequence: 3,
    description: 'Group addresses panel comments and submits the revised proposal for clearance.',
    requirements: [
      {
        key: 'REVISED_PROPOSAL',
        label: 'Revised Proposal Manuscript',
        description: 'Proposal incorporating all panel-required revisions.',
        required: true,
      },
      {
        key: 'REVISION_MATRIX',
        label: 'Revision Compliance Matrix',
        description: 'Point-by-point response to each panel comment.',
        required: true,
      },
    ],
  },
  {
    key: 'FINAL_DEVELOPMENT',
    name: 'Final Thesis Development',
    sequence: 4,
    description: 'Implementation, testing, results and discussion are completed (Chapters 4-5).',
    requirements: [
      {
        key: 'FINAL_MANUSCRIPT_DRAFT',
        label: 'Final Manuscript Draft (Chapters 1-5)',
        description: 'Complete manuscript including results, discussion and conclusion.',
        required: true,
      },
      {
        key: 'FINAL_ENDORSEMENT',
        label: 'Adviser Endorsement for Final Defense',
        description: 'Adviser certification that the group may proceed to final defense.',
        required: true,
      },
    ],
  },
  {
    key: 'FINAL_DEFENSE',
    name: 'Final Defense',
    sequence: 5,
    description: 'Completed thesis is defended before the panel and final revisions are cleared.',
    defenseType: 'FINAL',
    requirements: [
      {
        key: 'FINAL_PRESENTATION',
        label: 'Final Defense Presentation Deck',
        description: 'Slide deck used during the final defense.',
        required: true,
      },
      {
        key: 'FINAL_DEFENSE_FORM',
        label: 'Final Defense Result Form',
        description: 'Panel decision sheet recording the final defense outcome.',
        required: true,
      },
    ],
  },
  {
    key: 'COMPLETED',
    name: 'Completion & Archiving',
    sequence: 6,
    description: 'Hardbound-ready manuscript and clearance documents are filed for archiving.',
    requirements: [
      {
        key: 'APPROVED_MANUSCRIPT',
        label: 'Approved Final Manuscript',
        description: 'Camera-ready manuscript with complete approval sheet.',
        required: true,
      },
      {
        key: 'APPROVAL_SHEET',
        label: 'Signed Approval Sheet',
        description: 'Approval sheet signed by adviser, panel and department chair.',
        required: true,
      },
    ],
  },
];

const STAGE_BY_KEY = new Map(STAGES.map((s) => [s.key, s]));

export function getStage(key: string): StageDefinition | undefined {
  return STAGE_BY_KEY.get(key as StageKey);
}

export function stageName(key: string): string {
  return getStage(key)?.name ?? key;
}

export function stageSequence(key: string): number {
  return getStage(key)?.sequence ?? 0;
}

export function nextStage(key: string): StageDefinition | undefined {
  const seq = stageSequence(key);
  return STAGES.find((s) => s.sequence === seq + 1);
}

export function requirementsFor(stageKey: string): DocumentRequirement[] {
  return getStage(stageKey)?.requirements ?? [];
}

export function findRequirement(stageKey: string, requirementKey: string): DocumentRequirement | undefined {
  return requirementsFor(stageKey).find((r) => r.key === requirementKey);
}

/** Overall completion percentage for progress displays (FR-43). */
export function progressPercent(currentStageKey: string, approvedStageKeys: string[]): number {
  const total = STAGES.length;
  const approved = new Set(approvedStageKeys).size;
  const partial = stageSequence(currentStageKey) > approved ? 0.5 : 0;
  return Math.min(100, Math.round(((approved + partial) / total) * 100));
}

export type MilestoneGate = {
  canApprove: boolean;
  missing: string[];
};

/**
 * Decides whether a milestone may be marked approved (FR-40, FR-45).
 * `documents` is the current version of each submitted requirement.
 */
export function evaluateMilestoneGate(
  stageKey: string,
  documents: { requirementKey: string; status: string }[],
  defense?: { status: string } | null,
): MilestoneGate {
  const stage = getStage(stageKey);
  if (!stage) return { canApprove: false, missing: ['Unknown workflow stage.'] };

  const missing: string[] = [];

  for (const req of stage.requirements) {
    if (!req.required) continue;
    const doc = documents.find((d) => d.requirementKey === req.key);
    if (!doc) {
      missing.push(`${req.label} has not been submitted.`);
    } else if (doc.status !== 'APPROVED') {
      missing.push(`${req.label} is not yet approved (currently ${doc.status}).`);
    }
  }

  if (stage.defenseType) {
    if (!defense) {
      missing.push(`No ${stage.defenseType.toLowerCase()} defense has been scheduled.`);
    } else if (defense.status !== 'COMPLETED') {
      missing.push(`The ${stage.defenseType.toLowerCase()} defense is not yet marked completed.`);
    }
  }

  return { canApprove: missing.length === 0, missing };
}
