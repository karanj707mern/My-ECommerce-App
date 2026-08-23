import { IsBoolean, IsEnum, IsNotEmpty } from 'class-validator';
import { NotificationChannel, NotificationType } from '@/generated/prisma/client';

export class NotificationPreferenceDto {
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type!: NotificationType;

  @IsEnum(NotificationChannel)
  @IsNotEmpty()
  channel!: NotificationChannel;

  @IsBoolean()
  enabled!: boolean;
}