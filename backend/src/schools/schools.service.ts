import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthContext } from '../common/types/auth-context';
import { assertSchoolScope } from '../common/scope/scope.util';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Super Admin only — enforced by @Roles on the controller, not re-checked here. */
  create(dto: CreateSchoolDto) {
    return this.prisma.school.create({ data: dto });
  }

  /** Platform-wide list — Super Admin only. */
  listAll() {
    return this.prisma.school.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(ctx: AuthContext, id: string) {
    assertSchoolScope(ctx, id);
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw new NotFoundException('School not found');
    return school;
  }

  async update(ctx: AuthContext, id: string, dto: UpdateSchoolDto) {
    assertSchoolScope(ctx, id);
    return this.prisma.school.update({ where: { id }, data: dto });
  }

  /** Suspend, not delete — a school's data outlives a lapsed subscription. */
  async suspend(id: string) {
    return this.prisma.user.updateMany({ where: { schoolId: id }, data: { isActive: false } });
  }
}
