import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateGiftCardDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  expiredAt?: string | Date;

  @IsOptional()
  expiresAt?: string | Date;
}
