// One-off CLI to create (or promote) a Super Administrator — kept separate
// from seed.ts so re-seeding demo data never touches a real admin account.
//
// Usage:
//   npm run admin:create -- --email=you@example.com [--password=...] [--name="Your Name"]
//
// If --password is omitted for a NEW email, a random one is generated and
// printed once — it is not stored anywhere else, so save it immediately.
// If the email already has an account, its password is left untouched
// unless --password is explicitly given; the script only ensures the role.
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';

const prisma = new PrismaClient();

function generatePassword(): string {
  return randomBytes(12).toString('base64url'); // ~16 chars, URL-safe — no ambiguous punctuation to mistype
}

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      password: { type: 'string' },
      name: { type: 'string' },
    },
  });

  if (!values.email) {
    console.error('Usage: npm run admin:create -- --email=you@example.com [--password=...] [--name="Your Name"]');
    process.exit(1);
  }
  const email = values.email;

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing && !values.password) {
    await prisma.user.update({
      where: { email },
      data: { role: Role.SUPER_ADMIN, fullName: values.name ?? existing.fullName },
    });
    console.log(`"${email}" already had an account — promoted to SUPER_ADMIN. Password left unchanged.`);
    return;
  }

  const password = values.password ?? generatePassword();
  const passwordHash = await argon2.hash(password);
  const fullName = values.name ?? existing?.fullName ?? 'Super Administrator';

  await prisma.user.upsert({
    where: { email },
    update: { role: Role.SUPER_ADMIN, passwordHash, fullName },
    create: { role: Role.SUPER_ADMIN, email, passwordHash, fullName },
  });

  console.log('Super Admin ready:');
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
  console.log('Save this password now — it is only ever shown here, and re-running this command will change it again.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
