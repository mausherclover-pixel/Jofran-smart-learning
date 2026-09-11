// Re-exports Prisma's generated Role enum as the single source of truth —
// guards, decorators, and services all import Role from here (or directly
// from @prisma/client; both resolve to the same enum object) so a role
// comparison never fails to typecheck against a second, drifted definition.
export { Role } from '@prisma/client';

export const SCHOOL_STAFF_ROLES = ['SCHOOL_ADMIN', 'PRINCIPAL'] as const;
