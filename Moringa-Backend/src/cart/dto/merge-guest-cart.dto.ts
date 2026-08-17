import {
  IsArray,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GuestCartItemDto } from './guest-cart.dto';

export class MergeGuestCartDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  token?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestCartItemDto)
  items?: GuestCartItemDto[];
}
