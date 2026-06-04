import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

(process.env as any).NODE_ENV = 'development'
dotenv.config({ path: '.env', override: true })

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    seed: 'tsx ./prisma/seed.ts',
  },
  migrate: {
    async adapter(env: any) {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      })
      return new PrismaPg(pool)
    },
  },
} as any)