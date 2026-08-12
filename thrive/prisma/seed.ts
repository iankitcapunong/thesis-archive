/**
 * Administrator bootstrap for Project THRIVE.
 *
 * This is NOT a demo dataset — it creates nothing but the single administrator
 * account needed to open the system for the first time. Every other account is
 * either self-registered by a student (POST /api/auth/register) or provisioned
 * by an administrator in User Management (FR-06, FR-07).
 *
 * Idempotent and non-destructive: rerunning it never deletes records and never
 * overwrites an existing administrator's password.
 *
 * Run with: npm run db:seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

const DEFAULT_ADMIN_EMAIL = 'admin@carsu.edu.ph';

/**
 * A generated password is printed once and never persisted in plaintext, so no
 * shared default credential ever ships with the application (SRS NFR-09).
 */
function generatePassword(): string {
  return crypto.randomBytes(12).toString('base64url');
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).toLowerCase().trim();
  const supplied = process.env.ADMIN_PASSWORD;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, status: true },
  });

  if (existing) {
    console.log(`Administrator ${email} already exists — leaving the account untouched.`);
    console.log('To reset its password, use the account recovery flow or update it in User Management.');
    return;
  }

  const password = supplied || generatePassword();

  await prisma.user.create({
    data: {
      email,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      status: 'ACTIVE',
      passwordHash: await bcrypt.hash(password, 10),
      department: null,
      college: 'CCIS',
    },
  });

  console.log(`\nAdministrator account created.\n`);
  console.log(`  Email:    ${email}`);
  if (supplied) {
    console.log('  Password: (taken from ADMIN_PASSWORD)');
  } else {
    console.log(`  Password: ${password}`);
    console.log('\n  ^ Shown once only. Store it now, then change it after signing in.');
    console.log('    Set ADMIN_PASSWORD in .env to choose your own instead.');
  }
  console.log('');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
