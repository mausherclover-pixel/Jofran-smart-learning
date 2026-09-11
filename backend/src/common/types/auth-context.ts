import { Role } from '../enums/role.enum';

// What every guard/service reads off req.user after the JWT strategy runs.
// Carrying schoolId (and, for teachers, classIds) here — not re-derived per
// request — is what lets every query filter by scope without a controller
// having to remember to ask for it.
export interface AuthContext {
  userId: string;
  role: Role;
  schoolId: string | null; // null only for SUPER_ADMIN
  classIds: string[]; // populated for TEACHER; empty otherwise
  studentIds: string[]; // populated for PARENT (guardianOf); empty otherwise
}

// @types/passport declares `Express.Request.user?: Express.User` and expects
// consumers to shape `Express.User` — augmenting `Request` directly instead
// would conflict with that existing declaration.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends AuthContext {}
  }
}
