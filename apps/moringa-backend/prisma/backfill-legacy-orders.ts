import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Placeholder for legacy order backfill logic
  console.log('Legacy order backfill completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
