import { PrismaClient } from '@prisma/client';
import type { ITXClientDenyList } from '@prisma/client/runtime/library';
import { env } from './env';

const prismaClientSingleton = () => {
  return new PrismaClient().$extends({
    query: {
      user: {
        async create({ args, query }) {
          const result = await query(args);
          import('./services/sanity-sync.service')
            .then(({ syncUserToSanity }) => syncUserToSanity(result as any))
            .catch(console.error);
          return result;
        },
        async update({ args, query }) {
          const result = await query(args);
          import('./services/sanity-sync.service')
            .then(({ syncUserToSanity }) => syncUserToSanity(result as any))
            .catch(console.error);
          return result;
        },
      },
    },
  });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

/**
 * Transaction client for THIS client instance.
 *
 * Because the singleton is built with `$extends`, the object handed to a
 * `$transaction` callback is the extended client — not the base
 * `Prisma.TransactionClient`. Helpers that run inside a transaction must
 * accept this type, or they won't typecheck against the extended client.
 */
export type TxClient = Omit<typeof prisma, ITXClientDenyList>;

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
