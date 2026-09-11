import { ForbiddenException } from '@nestjs/common';
import { Role } from '../enums/role.enum';
import { AuthContext } from '../types/auth-context';

// The one boundary that matters is schoolId, not job title (see architecture
// §04). These helpers are called at the top of every service method that
// touches tenant-owned data — never left to the controller to remember.

const SCHOOL_WIDE_ROLES: Role[] = [Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.PRINCIPAL];

/** Throws unless the caller is Super Admin or belongs to `targetSchoolId`. */
export function assertSchoolScope(ctx: AuthContext, targetSchoolId: string): void {
  if (ctx.role === Role.SUPER_ADMIN) return;
  if (ctx.schoolId !== targetSchoolId) {
    throw new ForbiddenException('This school is outside your access scope');
  }
}

/** Throws unless the caller can act on `classId` — school-wide roles, or the assigned teacher. */
export function assertClassScope(ctx: AuthContext, classId: string): void {
  if (SCHOOL_WIDE_ROLES.includes(ctx.role)) return;
  if (ctx.role === Role.TEACHER && ctx.classIds.includes(classId)) return;
  throw new ForbiddenException('This class is outside your access scope');
}

/** Throws unless the caller can view `studentId` — school-wide roles, the student themself, or a linked guardian. */
export function assertStudentScope(ctx: AuthContext, studentId: string): void {
  if (SCHOOL_WIDE_ROLES.includes(ctx.role)) return;
  if (ctx.role === Role.STUDENT && ctx.userId === studentId) return;
  if (ctx.role === Role.PARENT && ctx.studentIds.includes(studentId)) return;
  // TEACHER scope to a specific student is resolved against the class roster
  // in the calling service (requires a DB lookup this util doesn't have).
  throw new ForbiddenException('This student is outside your access scope');
}

/** Prisma `where` fragment that confines a school-scoped query, unless the caller is Super Admin. */
export function schoolScopedWhere(ctx: AuthContext): { schoolId?: string } {
  return ctx.role === Role.SUPER_ADMIN ? {} : { schoolId: ctx.schoolId ?? '__none__' };
}
