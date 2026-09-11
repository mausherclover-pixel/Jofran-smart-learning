import { Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthContext } from '../common/types/auth-context';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('students/:studentId')
  listForStudent(@CurrentUser() ctx: AuthContext, @Param('studentId') studentId: string) {
    return this.reports.listForStudent(ctx, studentId);
  }

  @Post('students/:studentId/generate')
  requestNow(@CurrentUser() ctx: AuthContext, @Param('studentId') studentId: string) {
    return this.reports.requestNow(ctx, studentId);
  }
}
