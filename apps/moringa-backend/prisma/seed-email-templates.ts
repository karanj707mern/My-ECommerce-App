import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const templates = [
    {
      name: 'EMAIL_VERIFICATION',
      subject: 'Verify your email address',
      htmlBody: '<h1>Verify your email</h1><p>Click the link to verify</p>',
      textBody: 'Verify your email by clicking the link.',
    },
    {
      name: 'PASSWORD_RESET',
      subject: 'Reset your password',
      htmlBody: '<h1>Reset Password</h1><p>Click the link to reset</p>',
      textBody: 'Reset your password by clicking the link.',
    },
  ];

  for (const template of templates) {
    await prisma.emailTemplate.upsert({
      where: { name: template.name },
      update: template,
      create: template,
    });
  }

  console.log('Email templates seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
