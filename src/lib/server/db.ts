import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@/generated/prisma/client';

function createClient(databaseUrl = process.env.DATABASE_URL): PrismaClient {
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  const adapter = new PrismaNeon({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}

export function createPrismaClient(databaseUrl: string): PrismaClient {
  return createClient(databaseUrl);
}

let client: PrismaClient | undefined;

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_, prop) {
    if (!client) client = createClient();
    const value = Reflect.get(client, prop);
    if (typeof value === 'function') return value.bind(client);
    return value;
  },
});
