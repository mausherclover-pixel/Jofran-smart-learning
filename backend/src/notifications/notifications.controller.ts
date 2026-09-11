import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthContext } from '../common/types/auth-context';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('me')
  listMine(@CurrentUser() ctx: AuthContext, @Query('unread') unread?: string) {
    return this.notifications.listMine(ctx, unread === 'true');
  }

  @Patch(':id/read')
  markRead(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    return this.notifications.markRead(ctx, id);
  }
}
