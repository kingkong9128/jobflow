import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;

export const DEFAULT_USER_ID = 'default-user';

export async function ensureDefaultUser(): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: DEFAULT_USER_ID }
  });
  
  if (!user) {
    await prisma.user.create({
      data: {
        id: DEFAULT_USER_ID,
        email: 'local@example.com',
        passwordHash: null
      }
    });
  }
}

prisma.$connect().then(ensureDefaultUser);