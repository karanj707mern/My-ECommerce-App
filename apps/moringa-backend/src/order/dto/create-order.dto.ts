import { IsString, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsOptional()
  addressId?: string;

  @IsString()
  @IsOptional()
  shippingType?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  couponCode?: string;
}
