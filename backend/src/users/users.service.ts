import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '../common/enums/role.enum';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthContext } from '../common/types/auth-context';
import { assertSchoolScope } from '../common/scope/scope.util';
import { UpdateUserDto } from './dto/update-user.dto';

const SAFE_SELECT = {
  id: true,
  role: true,
  schoolId: true,
  fullName: true,
  username: true,
  email: true,
  locale: true,
  isActive: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(ctx: AuthContext) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: SAFE_SELECT });
  }

  async findOne(ctx: AuthContext, id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!user) throw new NotFoundException('User not found');
    // A Super Admin has no schoolId to scope against — only another Super
    // Admin (or the user themself) may look one up.
    if (!user.schoolId && ctx.role !== Role.SUPER_ADMIN && ctx.userId !== user.id) {
      throw new ForbiddenException('This user is outside your access scope');
    }
    if (user.schoolId) assertSchoolScope(ctx, user.schoolId);
    return user;
  }

  /** Staff roster for one school — School Administrator and Principal only (enforced by @Roles on the controller). */
  async listForSchool(ctx: AuthContext, schoolId: string) {
    assertSchoolScope(ctx, schoolId);
    return this.prisma.user.findMany({
      where: { schoolId },
      select: SAFE_SELECT,
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
    });
  }

  async updateProfile(ctx: AuthContext, id: string, dto: UpdateUserDto) {
    const target = await this.findOne(ctx, id); // scope check
    if (target.id !== ctx.userId) assertSchoolScope(ctx, target.schoolId!);
    return this.prisma.user.update({ where: { id }, data: dto, select: SAFE_SELECT });
  }

  async deactivate(ctx: AuthContext, id: string) {
    const target = await this.findOne(ctx, id);
    assertSchoolScope(ctx, target.schoolId!);
    return this.prisma.user.update({ where: { id }, data: { isActive: false }, select: SAFE_SELECT });
  }
}
