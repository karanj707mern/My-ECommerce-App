import { IsNumber } from 'class-validator';

export class GuestCartItemDto {
  @IsNumber()
  productId!: number;

  @IsNumber()
  quantity!: number;
}
