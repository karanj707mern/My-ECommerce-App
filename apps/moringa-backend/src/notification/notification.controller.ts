import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '../generated/prisma/client';
import { NotificationPreferenceDto } from './dto/notification-preference.dto';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/rolesguard';
import { Roles } from '../auth/decorators/roles.decorator';

interface AuthedRequest {
  user: { id: number };
}

@ApiTags('Notification')
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get paginated notifications for the current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getUserNotifications(
    @Req() req: AuthedRequest,
    @Query() query: { page?: number; limit?: number }
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    if (page < 1) {
      throw new BadRequestException('page must be >= 1');
    }
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('limit must be between 1 and 100');
    }

    return this.notificationService.getUserNotifications(req.user.id, page, limit);
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get unread notification count for the current user',
  })
  getUnreadCount(@Req() req: AuthedRequest) {
    return this.notificationService.getUnreadCount(req.user.id);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  markNotificationAsRead(
    @Req() req: AuthedRequest,
    @Param('id', ParseIntPipe) notificationId: number
  ) {
    return this.notificationService.markNotificationAsRead(notificationId, req.user.id);
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Mark all notifications as read for the current user',
  })
  markAllNotificationsAsRead(@Req() req: AuthedRequest) {
    return this.notificationService.markAllNotificationsAsRead(req.user.id);
  }

  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get notification preferences for the current user',
  })
  getUserPreferences(@Req() req: AuthedRequest) {
    return this.notificationService.getUserPreferences(req.user.id);
  }

  @Patch('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update a notification preference for the current user',
  })
  updateNotificationPreference(@Req() req: AuthedRequest, @Body() dto: NotificationPreferenceDto) {
    return this.notificationService.updateNotificationPreference(req.user.id, dto);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Find all notifications (admin)' })
  @ApiQuery({ name: 'orderId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAdminNotifications(
    @Query()
    query: {
      orderId?: string;
      status?: NotificationStatus;
      channel?: NotificationChannel;
      type?: NotificationType;
      page?: number;
      limit?: number;
    }
  ) {
    const orderId = query.orderId ? parseInt(query.orderId, 10) : undefined;
    if (query.orderId && isNaN(orderId!)) {
      throw new BadRequestException('Invalid orderId');
    }

    return this.notificationService.findAdminNotifications({
      orderId,
      status: query.status,
      channel: query.channel,
      type: query.type,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  @Get('admin/health')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get notification system health (admin)' })
  getHealth() {
    return this.notificationService.getHealth();
  }
}
