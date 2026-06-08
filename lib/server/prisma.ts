import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function parseMysqlUrl(url: string) {
  // mysql://user:password@host:port/database
  const u = new URL(url)
  return {
    host: u.hostname,
    port: u.port ? parseInt(u.port) : 3306,
    user: u.username,
    password: u.password,
    database: u.pathname.replace(/^\//, ''),
    connectionLimit: 5,
    allowPublicKeyRetrieval: true,
  }
}

function createPrismaClient() {
  const urlParams = parseMysqlUrl(process.env.DATABASE_URL!)
  console.log(`[Database] Attempting to connect to MySQL...`);
  console.log(`[Database] Host: ${urlParams.host}:${urlParams.port}`);
  console.log(`[Database] User: ${urlParams.user} | Database: ${urlParams.database}`);

  const adapter = new PrismaMariaDb(urlParams)
  const client = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  })

  client.$connect()
    .then(() => {
      console.log(`[Database] ✅ Successfully connected to database!`);
    })
    .catch((err) => {
      console.error(`[Database] ❌ Connection failed:`, err.message);
    });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
