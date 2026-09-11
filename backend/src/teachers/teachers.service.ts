import { Injectable } from '@nestjs/common';
import { AttemptStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthContext } from '../common/types/auth-context';

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Classes assigned to the current teacher — the scope embedded as `classIds` in their JWT. */
  async myClasses(ctx: AuthContext) {
    return this.prisma.class.findMany({
      where: { teacherId: ctx.userId },
      include: { _count: { select: { enrollments: true } }, academicTerm: true },
      orderBy: { grade: 'asc' },
    });
  }

  /** A teacher's queue: submitted attempts across their classes still awaiting a grade. */
  async pendingGrading(ctx: AuthContext) {
    return this.prisma.attempt.findMany({
      where: {
        status: AttemptStatus.SUBMITTED,
        assessment: { class: { teacherId: ctx.userId } },
      },
      include: {
        student: { select: { id: true, fullName: true } },
        assessment: { select: { id: true, title: true, classId: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }
}
