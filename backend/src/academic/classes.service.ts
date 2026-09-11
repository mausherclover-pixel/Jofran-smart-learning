import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthContext } from '../common/types/auth-context';
import { assertClassScope, assertSchoolScope } from '../common/scope/scope.util';
import { CreateClassDto } from './dto/create-class.dto';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ctx: AuthContext, schoolId: string, dto: CreateClassDto) {
    assertSchoolScope(ctx, schoolId);
    return this.prisma.class.create({ data: { ...dto, schoolId } });
  }

  /** Every class in the school — reachable by school-wide roles; a Teacher's own classes come from TeachersService.myClasses instead. */
  async listForSchool(ctx: AuthContext, schoolId: string) {
    assertSchoolScope(ctx, schoolId);
    return this.prisma.class.findMany({
      where: { schoolId },
      include: { teacher: { select: { id: true, fullName: true } }, _count: { select: { enrollments: true } } },
      orderBy: { grade: 'asc' },
    });
  }

  async findOne(ctx: AuthContext, id: string) {
    assertClassScope(ctx, id);
    return this.prisma.class.findUniqueOrThrow({
      where: { id },
      include: { teacher: true, enrollments: { include: { student: true } } },
    });
  }
}
