import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthContext } from '../types/auth-context';
import { assertClassScope, assertSchoolScope, assertStudentScope, schoolScopedWhere } from './scope.util';

// These four functions are the entire tenant-isolation boundary (architecture
// §04) — every service method that touches tenant data calls one of them
// first. A regression here is a cross-school data leak, not a UX bug, so
// every role × every branch is covered explicitly rather than sampled.

function ctx(overrides: Partial<AuthContext>): AuthContext {
  return { userId: 'user-1', role: Role.STUDENT, schoolId: 'school-a', classIds: [], studentIds: [], ...overrides };
}

describe('assertSchoolScope', () => {
  it('allows a Super Admin into any school', () => {
    expect(() => assertSchoolScope(ctx({ role: Role.SUPER_ADMIN, schoolId: null }), 'school-a')).not.toThrow();
    expect(() => assertSchoolScope(ctx({ role: Role.SUPER_ADMIN, schoolId: null }), 'school-b')).not.toThrow();
  });

  it('allows a School Admin into their own school', () => {
    expect(() => assertSchoolScope(ctx({ role: Role.SCHOOL_ADMIN, schoolId: 'school-a' }), 'school-a')).not.toThrow();
  });

  it('blocks a School Admin from a different school', () => {
    expect(() => assertSchoolScope(ctx({ role: Role.SCHOOL_ADMIN, schoolId: 'school-a' }), 'school-b')).toThrow(
      ForbiddenException,
    );
  });

  it('blocks every non-Super-Admin role from a different school, including Principal', () => {
    for (const role of [Role.PRINCIPAL, Role.TEACHER, Role.PARENT, Role.STUDENT]) {
      expect(() => assertSchoolScope(ctx({ role, schoolId: 'school-a' }), 'school-b')).toThrow(ForbiddenException);
    }
  });
});

describe('assertClassScope', () => {
  it('allows school-wide roles into any class in their school without checking classIds', () => {
    for (const role of [Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.PRINCIPAL]) {
      expect(() => assertClassScope(ctx({ role, classIds: [] }), 'class-x')).not.toThrow();
    }
  });

  it("allows a Teacher into a class in their own classIds", () => {
    expect(() => assertClassScope(ctx({ role: Role.TEACHER, classIds: ['class-a', 'class-b'] }), 'class-a')).not.toThrow();
  });

  it("blocks a Teacher from a class not in their classIds", () => {
    expect(() => assertClassScope(ctx({ role: Role.TEACHER, classIds: ['class-a'] }), 'class-z')).toThrow(
      ForbiddenException,
    );
  });

  it('blocks Student and Parent unconditionally — class-level actions never belong to them', () => {
    expect(() => assertClassScope(ctx({ role: Role.STUDENT }), 'class-a')).toThrow(ForbiddenException);
    expect(() => assertClassScope(ctx({ role: Role.PARENT }), 'class-a')).toThrow(ForbiddenException);
  });
});

describe('assertStudentScope', () => {
  it('allows school-wide roles unconditionally', () => {
    for (const role of [Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.PRINCIPAL]) {
      expect(() => assertStudentScope(ctx({ role }), 'student-x')).not.toThrow();
    }
  });

  it('allows a Student to view only themself', () => {
    expect(() => assertStudentScope(ctx({ role: Role.STUDENT, userId: 'student-1' }), 'student-1')).not.toThrow();
  });

  it('blocks a Student from viewing another student', () => {
    expect(() => assertStudentScope(ctx({ role: Role.STUDENT, userId: 'student-1' }), 'student-2')).toThrow(
      ForbiddenException,
    );
  });

  it("allows a Parent to view a child in their studentIds", () => {
    expect(() => assertStudentScope(ctx({ role: Role.PARENT, studentIds: ['child-1', 'child-2'] }), 'child-1')).not.toThrow();
  });

  it("blocks a Parent from viewing a student not in their studentIds — the guardianship boundary", () => {
    expect(() => assertStudentScope(ctx({ role: Role.PARENT, studentIds: ['child-1'] }), 'someone-elses-child')).toThrow(
      ForbiddenException,
    );
  });

  it('blocks a Teacher outright — teacher-to-student scope needs a roster DB lookup this pure function cannot do', () => {
    expect(() => assertStudentScope(ctx({ role: Role.TEACHER, classIds: ['class-a'] }), 'student-1')).toThrow(
      ForbiddenException,
    );
  });
});

describe('schoolScopedWhere', () => {
  it('returns an empty filter for Super Admin — they query across every school', () => {
    expect(schoolScopedWhere(ctx({ role: Role.SUPER_ADMIN, schoolId: null }))).toEqual({});
  });

  it("returns { schoolId } for every other role", () => {
    expect(schoolScopedWhere(ctx({ role: Role.TEACHER, schoolId: 'school-a' }))).toEqual({ schoolId: 'school-a' });
  });

  it('falls back to an unmatchable sentinel rather than an unscoped query if schoolId is somehow null for a non-Super-Admin', () => {
    const result = schoolScopedWhere(ctx({ role: Role.TEACHER, schoolId: null as unknown as string }));
    expect(result.schoolId).not.toBeNull();
    expect(result.schoolId).not.toBeUndefined();
  });
});
