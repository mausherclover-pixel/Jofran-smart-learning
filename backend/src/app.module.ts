import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import configuration from './config/configuration';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SchoolsModule } from './schools/schools.module';
import { StudentsModule } from './students/students.module';
import { ParentsModule } from './parents/parents.module';
import { TeachersModule } from './teachers/teachers.module';
import { AcademicModule } from './academic/academic.module';
import { QuizModule } from './quiz/quiz.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(), // powers the nightly report-generation cron (§09)

    // Per-route/per-IP sliding window — tightened further on /auth/* via @Throttle (§15).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),

    // Dashboards (Parent, Teacher, Principal) query GraphQL; everything else is REST (§03).
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      context: ({ req }: { req: unknown }) => ({ req }),
    }),

    PrismaModule,
    RedisModule,
    AiModule,

    AuthModule,
    UsersModule,
    SchoolsModule,
    StudentsModule,
    ParentsModule,
    TeachersModule,
    AcademicModule,
    QuizModule,
    ReportsModule,
    NotificationsModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
