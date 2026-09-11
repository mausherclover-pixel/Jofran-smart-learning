import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthContext } from '../common/types/auth-context';
import { assertClassScope, assertSchoolScope } from '../common/scope/scope.util';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

const SCHOOL_WIDE_ROLES: Role[] = [Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.PRINCIPAL];

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ctx: AuthContext, dto: CreateAssessmentDto) {
    assertClassScope(ctx, dto.classId);
    return this.prisma.assessment.create({
      data: {
        classId: dto.classId,
        lessonId: dto.lessonId,
        authorId: ctx.userId,
        type: dto.type,
        title: dto.title,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        questions: { create: dto.questions.map((q, order) => ({ ...q, order })) },
      },
      include: { questions: true },
    });
  }

  async listForClass(ctx: AuthContext, classId: string) {
    assertClassScope(ctx, classId);
    return this.prisma.assessment.findMany({
      where: { classId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { questions: true, attempts: true } } },
    });
  }

  /** A student sees questions without the answer key; everyone else with access sees everything. */
  async findOne(ctx: AuthContext, id: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: { questions: { orderBy: { order: 'asc' } }, class: true },
    });
    if (!assessment) throw new NotFoundException('Assessment not found');

    await this.assertCanView(ctx, assessment.classId, assessment.class.schoolId);

    if (ctx.role === Role.STUDENT) {
      assessment.questions = assessment.questions.map((q) => ({ ...q, correctAnswer: null }));
    }
    return assessment;
  }

  private async assertCanView(ctx: AuthContext, classId: string, schoolId: string): Promise<void> {
    if (SCHOOL_WIDE_ROLES.includes(ctx.role)) return assertSchoolScope(ctx, schoolId);
    if (ctx.role === Role.TEACHER) return assertClassScope(ctx, classId);

    // STUDENT: must be enrolled in this class. PARENT: must have a child enrolled in it.
    const studentIds = ctx.role === Role.STUDENT ? [ctx.userId] : ctx.studentIds;
    const enrolled = await this.prisma.enrollment.findFirst({
      where: { classId, studentId: { in: studentIds } },
    });
    if (!enrolled) throw new ForbiddenException('This assessment is outside your access scope');
  }
}
