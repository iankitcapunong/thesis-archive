/**
 * Demo dataset for Project THRIVE.
 * Creates one account per user class (SRS 2.4) plus thesis groups spread
 * across every workflow stage so each dashboard has meaningful content.
 *
 * Run with: npm run db:seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { makePlaceholderPdf } from './pdf';

const prisma = new PrismaClient();
const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'documents');
const DEMO_PASSWORD = 'Thrive@2027';

// Mirrors src/lib/workflow.ts. Kept literal here so seeding never depends on
// the Next.js module graph (server-only imports).
const STAGES = [
  { key: 'PROPOSAL_DEVELOPMENT', name: 'Proposal Development', sequence: 1 },
  { key: 'PROPOSAL_DEFENSE', name: 'Proposal Defense', sequence: 2 },
  { key: 'REVISION', name: 'Post-Defense Revision', sequence: 3 },
  { key: 'FINAL_DEVELOPMENT', name: 'Final Thesis Development', sequence: 4 },
  { key: 'FINAL_DEFENSE', name: 'Final Defense', sequence: 5 },
  { key: 'COMPLETED', name: 'Completion & Archiving', sequence: 6 },
];

const REQUIREMENTS: Record<string, { key: string; label: string }[]> = {
  PROPOSAL_DEVELOPMENT: [
    { key: 'PROPOSAL_MANUSCRIPT', label: 'Proposal Manuscript (Chapters 1-3)' },
    { key: 'ADVISER_ENDORSEMENT', label: 'Adviser Endorsement Form' },
  ],
  PROPOSAL_DEFENSE: [
    { key: 'PROPOSAL_PRESENTATION', label: 'Defense Presentation Deck' },
    { key: 'PROPOSAL_DEFENSE_FORM', label: 'Proposal Defense Result Form' },
  ],
  REVISION: [
    { key: 'REVISED_PROPOSAL', label: 'Revised Proposal Manuscript' },
    { key: 'REVISION_MATRIX', label: 'Revision Compliance Matrix' },
  ],
  FINAL_DEVELOPMENT: [
    { key: 'FINAL_MANUSCRIPT_DRAFT', label: 'Final Manuscript Draft (Chapters 1-5)' },
    { key: 'FINAL_ENDORSEMENT', label: 'Adviser Endorsement for Final Defense' },
  ],
  FINAL_DEFENSE: [
    { key: 'FINAL_PRESENTATION', label: 'Final Defense Presentation Deck' },
    { key: 'FINAL_DEFENSE_FORM', label: 'Final Defense Result Form' },
  ],
  COMPLETED: [
    { key: 'APPROVED_MANUSCRIPT', label: 'Approved Final Manuscript' },
    { key: 'APPROVAL_SHEET', label: 'Signed Approval Sheet' },
  ],
};

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * DAY);
const daysAhead = (n: number) => new Date(now + n * DAY);

async function writePlaceholder(title: string, subtitle: string) {
  await fs.mkdir(STORAGE_ROOT, { recursive: true });
  const bytes = makePlaceholderPdf(title, subtitle);
  const storedName = `${crypto.randomUUID()}.pdf`;
  await fs.writeFile(path.join(STORAGE_ROOT, storedName), bytes);
  return {
    storedName,
    sizeBytes: bytes.byteLength,
    checksum: crypto.createHash('sha256').update(bytes).digest('hex'),
  };
}

async function main() {
  console.log('Seeding CSU-THRIVE demo data...');

  // Clean slate (child rows first).
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.evaluation.deleteMany(),
    prisma.archivedThesis.deleteMany(),
    prisma.document.deleteMany(),
    prisma.milestone.deleteMany(),
    prisma.defensePanelist.deleteMany(),
    prisma.defenseSchedule.deleteMany(),
    prisma.panelAssignment.deleteMany(),
    prisma.adviserRequest.deleteMany(),
    prisma.thesisMember.deleteMany(),
    prisma.thesisProject.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  await fs.rm(STORAGE_ROOT, { recursive: true, force: true });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const CS = 'Department of Computer Science';
  const IT = 'Department of Information Technology';

  const mkUser = (
    email: string,
    firstName: string,
    lastName: string,
    role: string,
    extra: Record<string, unknown> = {},
  ) => ({ email, firstName, lastName, role, passwordHash, college: 'CCIS', ...extra });

  // --- staff -----------------------------------------------------------------
  const staffData = [
    mkUser('admin@carsu.edu.ph', 'Miguel', 'Bautista', 'ADMIN', { schoolId: 'EMP-0001', department: CS }),
    mkUser('coordinator@carsu.edu.ph', 'Liza', 'Fernandez', 'RESEARCH_COORDINATOR', { schoolId: 'EMP-0102', department: CS }),
    mkUser('chair@carsu.edu.ph', 'Ronaldo', 'Villanueva', 'DEPARTMENT_CHAIR', { schoolId: 'EMP-0088', department: CS }),
    mkUser('dean@carsu.edu.ph', 'Carmela', 'Duterte', 'COLLEGE_ADMIN', { schoolId: 'EMP-0010', department: CS }),
    mkUser('adviser@carsu.edu.ph', 'Alfredo', 'Santos', 'FACULTY_ADVISER', { schoolId: 'EMP-0211', department: CS, advisingLoad: 5 }),
    mkUser('rmarquez@carsu.edu.ph', 'Rowena', 'Marquez', 'FACULTY_ADVISER', { schoolId: 'EMP-0212', department: CS, advisingLoad: 4 }),
    mkUser('jtolentino@carsu.edu.ph', 'Jerome', 'Tolentino', 'FACULTY_ADVISER', { schoolId: 'EMP-0213', department: IT, advisingLoad: 3 }),
    mkUser('panel@carsu.edu.ph', 'Nerissa', 'Aguilar', 'PANEL_MEMBER', { schoolId: 'EMP-0301', department: CS }),
    mkUser('dlacson@carsu.edu.ph', 'Daniel', 'Lacson', 'PANEL_MEMBER', { schoolId: 'EMP-0302', department: CS }),
    mkUser('pgonzales@carsu.edu.ph', 'Patricia', 'Gonzales', 'PANEL_MEMBER', { schoolId: 'EMP-0303', department: IT }),
  ];

  // --- students --------------------------------------------------------------
  const studentSeeds: [string, string, string, string, string][] = [
    ['student@carsu.edu.ph', 'Andrea', 'Reyes', '2021-00451', 'BS Computer Science'],
    ['kdelacruz@carsu.edu.ph', 'Kier', 'Dela Cruz', '2021-00452', 'BS Computer Science'],
    ['mvillar@carsu.edu.ph', 'Mika', 'Villar', '2021-00453', 'BS Computer Science'],
    ['jpascual@carsu.edu.ph', 'Joshua', 'Pascual', '2021-00461', 'BS Computer Science'],
    ['rlim@carsu.edu.ph', 'Rhea', 'Lim', '2021-00462', 'BS Computer Science'],
    ['cabellera@carsu.edu.ph', 'Carlo', 'Abellera', '2021-00471', 'BS Information Technology'],
    ['ssalazar@carsu.edu.ph', 'Sofia', 'Salazar', '2021-00472', 'BS Information Technology'],
    ['bmanalo@carsu.edu.ph', 'Bryan', 'Manalo', '2020-00311', 'BS Computer Science'],
    ['tnavarro@carsu.edu.ph', 'Trisha', 'Navarro', '2020-00312', 'BS Computer Science'],
    ['ecastro@carsu.edu.ph', 'Elmer', 'Castro', '2020-00321', 'BS Information Technology'],
    ['gyabut@carsu.edu.ph', 'Grace', 'Yabut', '2020-00322', 'BS Information Technology'],
    ['nfuentes@carsu.edu.ph', 'Neil', 'Fuentes', '2021-00481', 'BS Computer Science'],
  ];

  const studentData = studentSeeds.map(([email, first, last, id, program]) =>
    mkUser(email, first, last, 'STUDENT', {
      schoolId: id,
      program,
      department: program === 'BS Information Technology' ? IT : CS,
    }),
  );

  await prisma.user.createMany({ data: [...staffData, ...studentData] });

  const users = await prisma.user.findMany();
  const byEmail = (email: string) => {
    const u = users.find((x) => x.email === email);
    if (!u) throw new Error(`Seed user not found: ${email}`);
    return u;
  };

  const coordinator = byEmail('coordinator@carsu.edu.ph');
  const santos = byEmail('adviser@carsu.edu.ph');
  const marquez = byEmail('rmarquez@carsu.edu.ph');
  const tolentino = byEmail('jtolentino@carsu.edu.ph');
  const aguilar = byEmail('panel@carsu.edu.ph');
  const lacson = byEmail('dlacson@carsu.edu.ph');
  const gonzales = byEmail('pgonzales@carsu.edu.ph');

  // --- thesis groups ---------------------------------------------------------
  type Spec = {
    referenceNo: string;
    title: string;
    abstract: string;
    keywords: string;
    program: string;
    department: string;
    academicYear: string;
    stage: string;
    status?: string;
    adviser?: typeof santos | null;
    members: string[];
    panel?: string[];
    /** Requirements already approved, per stage. */
    approvedStages: string[];
    /** Current stage documents: requirementKey -> status */
    currentDocs: Record<string, string>;
    defense?: { type: string; at: Date; venue: string; status: string };
  };

  const specs: Spec[] = [
    {
      referenceNo: 'THRIVE-2027-001',
      title: 'THRIVE: A Workflow-Driven Thesis Governance Platform for Caraga State University',
      abstract:
        'This study designs and evaluates a centralized academic governance platform that automates undergraduate thesis workflows, document lifecycle management, and institutional reporting within the College of Computing and Information Sciences.',
      keywords: 'academic governance, workflow automation, thesis management, design science',
      program: 'BS Computer Science',
      department: CS,
      academicYear: '2026-2027',
      stage: 'FINAL_DEVELOPMENT',
      adviser: santos,
      members: ['student@carsu.edu.ph', 'kdelacruz@carsu.edu.ph', 'mvillar@carsu.edu.ph'],
      panel: ['panel@carsu.edu.ph', 'dlacson@carsu.edu.ph'],
      approvedStages: ['PROPOSAL_DEVELOPMENT', 'PROPOSAL_DEFENSE', 'REVISION'],
      currentDocs: { FINAL_MANUSCRIPT_DRAFT: 'REVISE' },
      defense: { type: 'FINAL', at: daysAhead(21), venue: 'CCIS Audio-Visual Room', status: 'SCHEDULED' },
    },
    {
      referenceNo: 'THRIVE-2027-002',
      title: 'Deep Learning Approaches for Early Detection of Rice Blast Disease in Caraga Region',
      abstract:
        'A convolutional neural network model trained on field-collected imagery to identify rice blast infection at early growth stages, deployed as a mobile decision aid for local farmers.',
      keywords: 'deep learning, agriculture, image classification, precision farming',
      program: 'BS Computer Science',
      department: CS,
      academicYear: '2026-2027',
      stage: 'PROPOSAL_DEFENSE',
      adviser: marquez,
      members: ['jpascual@carsu.edu.ph', 'rlim@carsu.edu.ph'],
      panel: ['panel@carsu.edu.ph', 'pgonzales@carsu.edu.ph'],
      approvedStages: ['PROPOSAL_DEVELOPMENT'],
      currentDocs: { PROPOSAL_PRESENTATION: 'UNDER_REVIEW' },
      defense: { type: 'PROPOSAL', at: daysAhead(6), venue: 'CCIS Room 204', status: 'SCHEDULED' },
    },
    {
      referenceNo: 'THRIVE-2027-003',
      title: 'A Blockchain-Backed Credential Verification System for Higher Education Institutions',
      abstract:
        'This research proposes a permissioned blockchain ledger for issuing and verifying academic credentials, reducing manual verification overhead for registrar offices.',
      keywords: 'blockchain, credentials, verification, distributed ledger',
      program: 'BS Information Technology',
      department: IT,
      academicYear: '2026-2027',
      stage: 'PROPOSAL_DEVELOPMENT',
      adviser: tolentino,
      members: ['cabellera@carsu.edu.ph', 'ssalazar@carsu.edu.ph'],
      panel: ['pgonzales@carsu.edu.ph'],
      approvedStages: [],
      currentDocs: { PROPOSAL_MANUSCRIPT: 'PENDING' },
    },
    {
      referenceNo: 'THRIVE-2026-014',
      title: 'Sentiment-Aware Analytics Dashboard for Student Feedback in Flexible Learning',
      abstract:
        'A natural language processing pipeline that classifies student course feedback and surfaces actionable themes to faculty through an interactive analytics dashboard.',
      keywords: 'natural language processing, sentiment analysis, learning analytics',
      program: 'BS Computer Science',
      department: CS,
      academicYear: '2025-2026',
      stage: 'COMPLETED',
      status: 'ARCHIVED',
      adviser: santos,
      members: ['bmanalo@carsu.edu.ph', 'tnavarro@carsu.edu.ph'],
      panel: ['panel@carsu.edu.ph', 'dlacson@carsu.edu.ph'],
      approvedStages: [
        'PROPOSAL_DEVELOPMENT',
        'PROPOSAL_DEFENSE',
        'REVISION',
        'FINAL_DEVELOPMENT',
        'FINAL_DEFENSE',
        'COMPLETED',
      ],
      currentDocs: {},
      defense: { type: 'FINAL', at: daysAgo(65), venue: 'CCIS Audio-Visual Room', status: 'COMPLETED' },
    },
    {
      referenceNo: 'THRIVE-2027-004',
      title: 'IoT-Based Flood Early Warning Network for Riverside Barangays in Butuan City',
      abstract:
        'A low-cost sensor mesh streaming water-level telemetry to a public alerting service, evaluated against historical flood events in the Agusan river basin.',
      keywords: 'internet of things, disaster risk reduction, sensor networks',
      program: 'BS Information Technology',
      department: IT,
      academicYear: '2026-2027',
      stage: 'REVISION',
      adviser: tolentino,
      members: ['ecastro@carsu.edu.ph', 'gyabut@carsu.edu.ph'],
      panel: ['pgonzales@carsu.edu.ph', 'dlacson@carsu.edu.ph'],
      approvedStages: ['PROPOSAL_DEVELOPMENT', 'PROPOSAL_DEFENSE'],
      currentDocs: { REVISED_PROPOSAL: 'APPROVED', REVISION_MATRIX: 'UNDER_REVIEW' },
      defense: { type: 'PROPOSAL', at: daysAgo(18), venue: 'CCIS Room 204', status: 'COMPLETED' },
    },
    {
      // No adviser yet - exercises the pending adviser-request queue.
      referenceNo: 'THRIVE-2027-005',
      title: 'Gamified Mobile Learning Companion for Introductory Programming Courses',
      abstract:
        'An adaptive mobile application applying game mechanics to introductory programming exercises, measured against traditional laboratory instruction.',
      keywords: 'gamification, mobile learning, computing education',
      program: 'BS Computer Science',
      department: CS,
      academicYear: '2026-2027',
      stage: 'PROPOSAL_DEVELOPMENT',
      status: 'DRAFT',
      adviser: null,
      members: ['nfuentes@carsu.edu.ph'],
      approvedStages: [],
      currentDocs: {},
    },
  ];

  for (const spec of specs) {
    const memberUsers = spec.members.map(byEmail);

    const thesis = await prisma.thesisProject.create({
      data: {
        referenceNo: spec.referenceNo,
        title: spec.title,
        abstract: spec.abstract,
        keywords: spec.keywords,
        program: spec.program,
        department: spec.department,
        academicYear: spec.academicYear,
        status: spec.status ?? 'ACTIVE',
        currentStage: spec.stage,
        adviserId: spec.adviser?.id ?? null,
        createdById: memberUsers[0].id,
        completedAt: spec.status === 'ARCHIVED' ? daysAgo(50) : null,
        createdAt: daysAgo(120),
        members: {
          create: memberUsers.map((u, i) => ({ userId: u.id, groupRole: i === 0 ? 'LEADER' : 'MEMBER' })),
        },
        panel: spec.panel
          ? { create: spec.panel.map((e, i) => ({ panelistId: byEmail(e).id, panelRole: i === 0 ? 'CHAIR' : 'MEMBER' })) }
          : undefined,
      },
    });

    // Milestones: approved ones behind, current in progress, rest locked.
    const currentSeq = STAGES.find((s) => s.key === spec.stage)!.sequence;
    const milestones = await Promise.all(
      STAGES.map((stage) => {
        const approved = spec.approvedStages.includes(stage.key);
        const isCurrent = stage.key === spec.stage;
        const status = approved ? 'APPROVED' : isCurrent ? 'IN_PROGRESS' : stage.sequence < currentSeq ? 'APPROVED' : 'LOCKED';
        return prisma.milestone.create({
          data: {
            thesisId: thesis.id,
            stageKey: stage.key,
            name: stage.name,
            sequence: stage.sequence,
            status,
            startedAt: stage.sequence <= currentSeq ? daysAgo(120 - stage.sequence * 15) : null,
            submittedAt: status === 'APPROVED' ? daysAgo(115 - stage.sequence * 15) : null,
            approvedAt: status === 'APPROVED' ? daysAgo(110 - stage.sequence * 15) : null,
          },
        });
      }),
    );
    const milestoneByStage = new Map(milestones.map((m) => [m.stageKey, m]));

    // Approved history documents.
    for (const stageKey of spec.approvedStages) {
      for (const req of REQUIREMENTS[stageKey]) {
        const file = await writePlaceholder(req.label, `${spec.referenceNo} - ${spec.title.slice(0, 60)}`);
        const doc = await prisma.document.create({
          data: {
            thesisId: thesis.id,
            milestoneId: milestoneByStage.get(stageKey)!.id,
            requirementKey: req.key,
            title: req.label,
            fileName: `${req.key.toLowerCase()}.pdf`,
            storedName: file.storedName,
            mimeType: 'application/pdf',
            sizeBytes: file.sizeBytes,
            checksum: file.checksum,
            status: 'APPROVED',
            uploadedById: memberUsers[0].id,
            createdAt: daysAgo(100),
          },
        });
        if (spec.adviser) {
          await prisma.evaluation.create({
            data: {
              documentId: doc.id,
              evaluatorId: spec.adviser.id,
              decision: 'APPROVED',
              comments: 'Requirements met. Cleared for the next milestone.',
              createdAt: daysAgo(98),
            },
          });
        }
      }
    }

    // Current-stage documents.
    for (const [requirementKey, status] of Object.entries(spec.currentDocs)) {
      const req = REQUIREMENTS[spec.stage].find((r) => r.key === requirementKey)!;
      const file = await writePlaceholder(req.label, `${spec.referenceNo} - current submission`);
      const doc = await prisma.document.create({
        data: {
          thesisId: thesis.id,
          milestoneId: milestoneByStage.get(spec.stage)!.id,
          requirementKey,
          title: req.label,
          fileName: `${requirementKey.toLowerCase()}.pdf`,
          storedName: file.storedName,
          mimeType: 'application/pdf',
          sizeBytes: file.sizeBytes,
          checksum: file.checksum,
          status,
          uploadedById: memberUsers[0].id,
          createdAt: daysAgo(6),
        },
      });

      if (status === 'REVISE' && spec.adviser) {
        await prisma.evaluation.create({
          data: {
            documentId: doc.id,
            evaluatorId: spec.adviser.id,
            decision: 'REVISE',
            comments:
              'Chapter 4 needs a clearer description of the evaluation instrument, and Table 4.2 should report standard deviations alongside the means. Please also align the citation style in Section 4.3.',
            createdAt: daysAgo(3),
          },
        });
        await prisma.notification.createMany({
          data: memberUsers.map((u) => ({
            userId: u.id,
            category: 'EVALUATION',
            title: 'Revision requested',
            body: `${req.label} was returned for revision by your adviser.`,
            link: `/theses/${thesis.id}`,
            createdAt: daysAgo(3),
          })),
        });
      }

      if (status === 'UNDER_REVIEW' && spec.adviser) {
        await prisma.notification.create({
          data: {
            userId: spec.adviser.id,
            category: 'SUBMISSION',
            title: 'Document awaiting your review',
            body: `${memberUsers[0].firstName} ${memberUsers[0].lastName} submitted ${req.label}.`,
            link: `/theses/${thesis.id}`,
            createdAt: daysAgo(2),
          },
        });
      }
    }

    // Defense schedule.
    if (spec.defense) {
      const panelIds = (spec.panel ?? []).map(byEmail).map((u) => u.id);
      const schedule = await prisma.defenseSchedule.create({
        data: {
          thesisId: thesis.id,
          defenseType: spec.defense.type,
          scheduledAt: spec.defense.at,
          venue: spec.defense.venue,
          status: spec.defense.status,
          createdById: coordinator.id,
          panelists: {
            create: panelIds.map((id, i) => ({
              panelistId: id,
              panelRole: i === 0 ? 'CHAIR' : 'MEMBER',
              attended: spec.defense!.status === 'COMPLETED',
            })),
          },
        },
      });

      if (spec.defense.status === 'SCHEDULED') {
        await prisma.notification.createMany({
          data: [...memberUsers.map((u) => u.id), ...panelIds, spec.adviser?.id]
            .filter((id): id is string => Boolean(id))
            .map((userId) => ({
              userId,
              category: 'SCHEDULE',
              title: `${spec.defense!.type === 'PROPOSAL' ? 'Proposal' : 'Final'} defense scheduled`,
              body: `${spec.referenceNo} is scheduled on ${spec.defense!.at.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })} at ${spec.defense!.venue}.`,
              link: `/theses/${thesis.id}`,
              createdAt: daysAgo(5),
            })),
        });
      }
      void schedule;
    }

    // Archive the completed project.
    if (spec.status === 'ARCHIVED') {
      const manuscript = await prisma.document.findFirst({
        where: { thesisId: thesis.id, requirementKey: 'APPROVED_MANUSCRIPT' },
      });
      const authors = memberUsers.map((u) => `${u.lastName}, ${u.firstName[0]}.`).join(', ');
      await prisma.archivedThesis.create({
        data: {
          thesisId: thesis.id,
          manuscriptId: manuscript?.id ?? null,
          citation: `${authors} (2026). ${spec.title}. Undergraduate thesis, Caraga State University, ${spec.department}.`,
          keywords: spec.keywords,
          visibility: 'PUBLIC',
          archivedById: coordinator.id,
          archivedAt: daysAgo(45),
        },
      });
    }

    // Pending adviser request for the unadvised group.
    if (!spec.adviser) {
      await prisma.adviserRequest.create({
        data: {
          thesisId: thesis.id,
          adviserId: santos.id,
          status: 'PENDING',
          message:
            'Good day, Sir. We would like to request your guidance for our study on gamified programming instruction.',
          createdAt: daysAgo(2),
        },
      });
      await prisma.notification.create({
        data: {
          userId: santos.id,
          category: 'ADVISER',
          title: 'New adviser request',
          body: `${spec.referenceNo} requested you as thesis adviser.`,
          link: '/adviser/requests',
          createdAt: daysAgo(2),
        },
      });
    }
  }

  // --- audit trail -----------------------------------------------------------
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: byEmail('admin@carsu.edu.ph').id,
        action: 'USER_CREATED',
        entityType: 'User',
        summary: 'Provisioned faculty and student accounts for AY 2026-2027.',
        createdAt: daysAgo(130),
      },
      {
        actorId: coordinator.id,
        action: 'PANEL_ASSIGNED',
        entityType: 'ThesisProject',
        summary: 'Assigned defense panels for the first semester proposal defenses.',
        createdAt: daysAgo(30),
      },
      {
        actorId: santos.id,
        action: 'DOCUMENT_EVALUATED',
        entityType: 'Document',
        summary: 'Returned a final manuscript draft for revision.',
        createdAt: daysAgo(3),
      },
      {
        actorId: coordinator.id,
        action: 'THESIS_ARCHIVED',
        entityType: 'ThesisProject',
        summary: 'Archived THRIVE-2026-014 for institutional reference.',
        createdAt: daysAgo(45),
      },
    ],
  });

  const counts = {
    users: await prisma.user.count(),
    theses: await prisma.thesisProject.count(),
    documents: await prisma.document.count(),
    evaluations: await prisma.evaluation.count(),
    defenses: await prisma.defenseSchedule.count(),
    notifications: await prisma.notification.count(),
  };

  console.log('Seed complete:', counts);
  console.log(`\nAll demo accounts use the password: ${DEMO_PASSWORD}`);
  console.log('  admin@carsu.edu.ph        Administrator');
  console.log('  coordinator@carsu.edu.ph  Research Coordinator');
  console.log('  chair@carsu.edu.ph        Department Chair');
  console.log('  dean@carsu.edu.ph         College Administrator');
  console.log('  adviser@carsu.edu.ph      Faculty Adviser');
  console.log('  panel@carsu.edu.ph        Panel Member');
  console.log('  student@carsu.edu.ph      Student');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
