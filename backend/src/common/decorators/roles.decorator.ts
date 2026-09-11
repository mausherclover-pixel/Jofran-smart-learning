import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

// @Roles(Role.TEACHER, Role.PRINCIPAL) on a controller or handler.
// Enforced by RolesGuard — see common/guards/roles.guard.ts.
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
