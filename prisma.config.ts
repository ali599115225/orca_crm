import { defineConfig } from 'prisma/config'
import * as dotenv from 'dotenv'

;(process.env as Record<string, string>).NODE_ENV = 'development'
dotenv.config({ path: '.env.local', override: true })
dotenv.config({ path: '.env', override: false })

const datasourceUrl =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL

export default defineConfig({
  schema: 'prisma/schema.prisma',
  ...(datasourceUrl
    ? { datasource: { url: datasourceUrl } }
    : {}),
  migrations: {
    seed: 'tsx ./prisma/seed.ts',
  },
})

