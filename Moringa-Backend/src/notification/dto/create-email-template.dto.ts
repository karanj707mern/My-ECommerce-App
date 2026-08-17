import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import { Prisma } from '@prisma/client';

export class CreateEmailTemplateDto {
  @IsString()
  name!: string;

  @IsString()
  subject!: string;

  @IsString()
  htmlBody!: string;

  @IsOptional()
  @IsString()
  textBody?: string;

  @IsOptional()
  @IsObject()
  variables?: Prisma.InputJsonValue;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
