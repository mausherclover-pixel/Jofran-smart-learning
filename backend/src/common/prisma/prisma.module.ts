import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global: every module needs the database, and re-importing it everywhere
// would be noise without changing behavior.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
