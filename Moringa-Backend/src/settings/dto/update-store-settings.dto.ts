import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ShippingZoneDto {
  @IsString()
  key!: string;

  @IsString()
  label!: string;

  @IsArray()
  @IsString({ each: true })
  countries!: string[];

  @IsArray()
  @IsString({ each: true })
  allowedShippingTypes!: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingMultiplier?: number | null;
}

export class UpdateStoreSettingsDto {
  @IsNumber()
  @Min(0)
  shippingCharge!: number;

  @IsNumber()
  @Min(0)
  expressShippingCharge!: number;

  @IsNumber()
  @Min(0)
  sameDayShippingCharge!: number;

  @IsNumber()
  @Min(0)
  codCharge!: number;

  @IsNumber()
  @Min(0)
  handlingCharge!: number;

  @IsNumber()
  @Min(0)
  taxRate!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freeShippingThreshold?: number | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShippingZoneDto)
  shippingZones?: ShippingZoneDto[];

  @IsOptional()
  @IsBoolean()
  codEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCodOrderValue?: number | null;

  @IsOptional()
  @IsBoolean()
  allowInternationalCod?: boolean;

  @IsOptional()
  @IsInt()
  @Min(5)
  autoCancelPendingMinutes?: number;
}
