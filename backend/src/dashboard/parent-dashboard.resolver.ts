import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthContext } from '../common/types/auth-context';
import { AttemptStatus } from '@prisma/client';
import { ChildSummary, ParentDashboard } from './dto/parent-dashboard.type';

@Resolver(() => ParentDashboard)
@UseGuards(RolesGuard)
@Roles(Role.PARENT)
export class ParentDashboardResolver {
  constructor(private readonly prisma: PrismaService) {}

  @Query(() => ParentDashboard)
  async parentDashboard(@CurrentUser() ctx: AuthContext): Promise<ParentDashboard> {
    const guardianships = await this.prisma.guardianship.findMany({
      where: { parentId: ctx.userId },
      include: {
        student: {
          include: {
            enrollments: { include: { class: true }, orderBy: { createdAt: 'desc' }, take: 1 },
            progressRecords: true,
          },
        },
      },
    });

    const children: ChildSummary[] = await Promise.all(
      guardianships.map(async (g) => {
        const enrollment = g.student.enrollments[0];
        const mastery = g.student.progressRecords;
        const averageMastery = mastery.length ? mastery.reduce((s, p) => s + p.mastery, 0) / mastery.length : undefined;

        const pendingAssessments = enrollment
          ? await this.prisma.assessment.count({
              where: {
                classId: enrollment.classId,
                attempts: { none: { studentId: g.studentId, status: { not: AttemptStatus.IN_PROGRESS } } },
              },
            })
          : 0;

        return {
          id: g.studentId,
          fullName: g.student.fullName,
          className: enrollment?.class.name,
          grade: enrollment?.class.grade,
          averageMastery,
          pendingAssessments,
        };
      }),
    );

    return { children };
  }
}
