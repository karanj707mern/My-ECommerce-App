import { defineConfig } from 'prisma/config';

export default defineConfig({
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
  generator: {
    client: {
      provider: 'prisma-client-js',
    },
  },
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://moringa:moringa@localhost:5432/moringa',
  },
});
