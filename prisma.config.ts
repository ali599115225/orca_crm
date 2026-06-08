import { defineConfig } from 'prisma/config'
import * as dotenv from 'dotenv'

;(process.env as Record<string, string>).NODE_ENV = 'development'
dotenv.config({ path: '.env', override: true })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    seed: 'tsx ./prisma/seed.ts',
  },
})