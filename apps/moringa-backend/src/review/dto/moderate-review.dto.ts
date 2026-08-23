import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ModerateReviewDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;
}
