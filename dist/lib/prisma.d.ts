import type { Prisma } from '../generated/prisma/client';
/** Shared Prisma client. Import this everywhere (named or default). */
export declare const prisma: import("@/generated/prisma").PrismaClient<Prisma.PrismaClientOptions, never, import("@/generated/prisma/runtime/client").DefaultArgs>;
/** Underlying pg pool — exposed for graceful shutdown, not for query use. */
export declare const prismaPool: import("pg").Pool;
/** Idempotent shutdown: disconnect Prisma and end the pool. */
export declare const closePrisma: () => Promise<void>;
export default prisma;
//# sourceMappingURL=prisma.d.ts.map