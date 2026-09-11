import { Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthContext } from '../common/types/auth-context';
import { assertClassScope, assertSchoolScope, assertStudentScope } from '../common/scope/scope.util';
import { CreateStudentDto } from './dto/create-student.dto';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ctx: AuthContext, schoolId: string, dto: CreateStudentDto) {
    assertSchoolScope(ctx, schoolId);
    const klass = await this.prisma.class.findUniqueOrThrow({ where: { id: dto.classId } });
    assertSchoolScope(ctx, klass.schoolId);

    const passwordHash = await argon2.hash(dto.temporaryPassword);

    return this.prisma.$transaction(async (tx) => {
      const student = await tx.user.create({
        data: {
          role: Role.STUDENT,
          schoolId,
          fullName: dto.fullName,
          username: dto.username,
          passwordHash,
        },
      });
      await tx.enrollment.create({ data: { classId: dto.classId, studentId: student.id } });
      return student;
    });
  }

  /** A student's own profile, or a school-wide/class-scoped/guardian view of theirs. */
  async findOne(ctx: AuthContext, studentId: string) {
    assertStudentScope(ctx, studentId);
    const student = await this.prisma.user.findUnique({
      where: { id: studentId, role: Role.STUDENT },
      select: {
        id: true,
        fullName: true,
        username: true,
        schoolId: true,
        locale: true,
        enrollments: { include: { class: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  /** Roster for one class — Teacher of that class, or school-wide roles. */
  async listForClass(ctx: AuthContext, classId: string) {
    assertClassScope(ctx, classId);
    return this.prisma.enrollment.findMany({
      where: { classId },
      include: { student: { select: { id: true, fullName: true, username: true, locale: true } } },
      orderBy: { student: { fullName: 'asc' } },
    });
  }

  /** Mastery per skill — the data the adaptive-difficulty loop (architecture §11) reads and writes. */
  async progress(ctx: AuthContext, studentId: string) {
    assertStudentScope(ctx, studentId);
    return this.prisma.progressRecord.findMany({
      where: { studentId },
      include: { skill: { include: { subject: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
