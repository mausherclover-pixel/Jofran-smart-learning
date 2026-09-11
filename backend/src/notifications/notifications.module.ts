import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { QueueModule } from '../common/queue/queue.module';
import { NotificationFanoutProcessor } from './processors/notification-fanout.processor';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [QueueModule, JwtModule.register({})],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, NotificationFanoutProcessor],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
