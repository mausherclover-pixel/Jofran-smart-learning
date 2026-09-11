import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import { AuthContext } from '../types/auth-context';

// Runs after JwtAuthGuard. A handler with no @Roles() is reachable by any
// authenticated user; scoping to a school/class still happens in the service.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request =
      context.getType<'graphql'>() === 'graphql'
        ? GqlExecutionContext.create(context).getContext().req
        : context.switchToHttp().getRequest();
    const user: AuthContext | undefined = request.user;
    if (!user) return false;

    if (!required.includes(user.role)) {
      throw new ForbiddenException(`Role ${user.role} cannot access this resource`);
    }
    return true;
  }
}
