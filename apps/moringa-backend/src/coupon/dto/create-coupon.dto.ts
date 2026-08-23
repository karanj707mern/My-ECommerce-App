import {
  IsInt,
  IsOptional,
  IsString,
  IsNumber,
  MaxLength,
  Min,
  MinLength,
  IsIn,
} from 'class-validator';

export class CreateCouponDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  code!: string;

  @IsString()
  @IsIn(['PERCENTAGE', 'FIXED'])
  discountType!: 'PERCENTAGE' | 'FIXED';

  @IsNumber()
  @Min(0)
  discountValue!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @IsString()
  validFrom!: string;

  @IsString()
  validUntil!: string;
}
