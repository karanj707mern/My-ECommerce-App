import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { join } from 'path';

function loadEnv() {
  const nodeEnv = process.env.NODE_ENV || 'development';

  dotenv.config({ path: join(process.cwd(), '.env') });

  const envFile = join(process.cwd(), `.env.${nodeEnv}`);
  dotenv.config({ path: envFile, override: true });
}

loadEnv();

function usage() {
  console.log('Usage:');
  console.log('  npm run reset-admin-pass -- <email> <password>');
  console.log('');
  console.log(
    'Note: quote the password if it has special characters (@, $, !, space, etc.)',
  );
  console.log('Example:');
  console.log('  npm run reset-admin-pass -- karanj707@gmail.com "903322@kJ"');
  process.exit(1);
}

const [emailArg, passwordArg] = process.argv.slice(2);

if (!emailArg || !passwordArg) {
  usage();
}

const email = emailArg.trim();
const password = passwordArg.trim();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing. Check .env.development.');
  process.exit(1);
}

async function main() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log(`Resetting admin password using ${nodeEnv} environment...`);

  const { PrismaPg } = await import('@prisma/adapter-pg');

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });

  const prisma = new PrismaClient({ adapter });

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error(`User not found for email: ${email}`);
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetTokenExpiresAt: null,
      refreshToken: null,
      refreshTokenExpiresAt: null,
    },
  });

  console.log(`Password reset successful for ${email}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to reset admin password:', err);
    process.exit(1);
  });
