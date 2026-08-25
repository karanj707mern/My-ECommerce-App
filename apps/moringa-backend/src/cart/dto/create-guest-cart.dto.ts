import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { GuestCartItemDto } from './guest-cart.dto';

export class CreateGuestCartDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestCartItemDto)
  items?: GuestCartItemDto[];
}
