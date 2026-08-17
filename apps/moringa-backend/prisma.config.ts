import { defineConfig } from 'prisma/config';

export default defineConfig({
  generator: {
    client: {
      provider: 'prisma-client-js',
    },
  },
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://moringa:moringa@localhost:5432/moringa',
  },
});
