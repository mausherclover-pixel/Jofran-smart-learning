import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { AuthContext } from '../types/auth-context';
import { RolesGuard } from './roles.guard';

// The last line of defense before a handler runs. If this guard ever lets
// the wrong role through, every scope check further down the stack is
// exercised for nothing.

function buildHttpContext(user: AuthContext | undefined): ExecutionContext {
  return {
    getHandler: () => ({}) as any,
    getClass: () => ({}) as any,
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => ({ user }) }) as any,
  } as unknown as ExecutionContext;
}

function buildReflector(requiredRoles: Role[] | undefined): Reflector {
  return { getAllAndOverride: jest.fn().mockReturnValue(requiredRoles) } as unknown as Reflector;
}

const someUser = (role: Role): AuthContext => ({ userId: 'u1', role, schoolId: 's1', classIds: [], studentIds: [] });

describe('RolesGuard', () => {
  it('allows any authenticated user through a route with no @Roles() at all', () => {
    const guard = new RolesGuard(buildReflector(undefined));
    expect(guard.canActivate(buildHttpContext(someUser(Role.STUDENT)))).toBe(true);
  });

  it('allows any authenticated user through a route with an empty @Roles() list', () => {
    const guard = new RolesGuard(buildReflector([]));
    expect(guard.canActivate(buildHttpContext(someUser(Role.STUDENT)))).toBe(true);
  });

  it("allows a user whose role is in the required list", () => {
    const guard = new RolesGuard(buildReflector([Role.TEACHER, Role.PRINCIPAL]));
    expect(guard.canActivate(buildHttpContext(someUser(Role.TEACHER)))).toBe(true);
  });

  it("throws ForbiddenException for a user whose role is not in the required list", () => {
    const guard = new RolesGuard(buildReflector([Role.TEACHER]));
    expect(() => guard.canActivate(buildHttpContext(someUser(Role.STUDENT)))).toThrow(ForbiddenException);
  });

  it('returns false (never throws) when a role is required but req.user is missing entirely', () => {
    // This would mean JwtAuthGuard didn't run first — defense in depth, not
    // the expected path, but it must fail closed, not throw an unrelated error.
    const guard = new RolesGuard(buildReflector([Role.TEACHER]));
    expect(guard.canActivate(buildHttpContext(undefined))).toBe(false);
  });

  it('never allows Super Admin through implicitly — role checks are exact-match, not a hierarchy', () => {
    const guard = new RolesGuard(buildReflector([Role.TEACHER]));
    expect(() => guard.canActivate(buildHttpContext(someUser(Role.SUPER_ADMIN)))).toThrow(ForbiddenException);
  });
});
