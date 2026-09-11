import { Role } from '../common/enums/role.enum';
import { PrismaService } from '../common/prisma/prisma.service';
import { AccessTokenClaims } from './token.service';

// Computed once at login/refresh and embedded in the access token so guards
// never re-derive scope per request. A stale claim (e.g. a reassigned
// teacher) self-corrects within one access-token lifetime — 15 minutes.
export async function buildAccessClaims(
  prisma: PrismaService,
  user: { id: string; role: string; schoolId: string | null },
): Promise<AccessTokenClaims> {
  const role = user.role as Role;

  const classIds =
    role === Role.TEACHER
      ? (await prisma.class.findMany({ where: { teacherId: user.id }, select: { id: true } })).map((c) => c.id)
      : [];

  const studentIds =
    role === Role.PARENT
      ? (await prisma.guardianship.findMany({ where: { parentId: user.id }, select: { studentId: true } })).map(
          (g) => g.studentId,
        )
      : [];

  return { sub: user.id, role, schoolId: user.schoolId, classIds, studentIds };
}
