import { Module } from '@nestjs/common';
import { ParentDashboardResolver } from './parent-dashboard.resolver';

@Module({
  providers: [ParentDashboardResolver],
})
export class DashboardModule {}
