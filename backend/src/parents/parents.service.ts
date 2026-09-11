import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthContext } from '../common/types/auth-context';
import { assertSchoolScope, assertStudentScope } from '../common/scope/scope.util';
import { LinkGuardianDto } from './dto/link-guardian.dto';

@Injectable()
export class ParentsService {
  constructor(private readonly prisma: PrismaService) {}

  async link(ctx: AuthContext, dto: LinkGuardianDto) {
    // findUniqueOrThrow on both doubles as validation that the ids are real
    // and hold the roles they claim to.
    await this.prisma.user.findUniqueOrThrow({ where: { id: dto.parentId, role: Role.PARENT } });
    const student = await this.prisma.user.findUniqueOrThrow({ where: { id: dto.studentId, role: Role.STUDENT } });
    assertSchoolScope(ctx, student.schoolId!);

    return this.prisma.guardianship.upsert({
      where: { parentId_studentId: { parentId: dto.parentId, studentId: dto.studentId } },
      update: { relation: dto.relation ?? 'parent' },
      create: { parentId: dto.parentId, studentId: dto.studentId, relation: dto.relation ?? 'parent' },
    });
  }

  /** The children a Parent is scoped to see — same list embedded as `studentIds` in their JWT. */
  async myChildren(ctx: AuthContext) {
    return this.prisma.guardianship.findMany({
      where: { parentId: ctx.userId },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            locale: true,
            enrollments: { include: { class: true }, orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });
  }

  async childProgress(ctx: AuthContext, studentId: string) {
    assertStudentScope(ctx, studentId);
    return this.prisma.progressRecord.findMany({
      where: { studentId },
      include: { skill: { include: { subject: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
