import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @MaxLength(100)
  recipientName!: string;

  @IsString()
  @MaxLength(20)
  phoneNumber!: string;

  @IsString()
  @MaxLength(255)
  addressLine1!: string;

  @IsOptional()
  @IsIn(['standard', 'express', 'sameDay', 'prime'])
  shippingType?: 'standard' | 'express' | 'sameDay' | 'prime';

  @IsOptional()
  @IsIn(['online', 'cod'])
  paymentMethod?: 'online' | 'cod';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  promoCode?: string;

  @IsString()
  @MaxLength(100)
  city!: string;

  @IsString()
  @MaxLength(100)
  state!: string;

  @IsString()
  @MaxLength(20)
  postalCode!: string;

  @IsString()
  @MaxLength(100)
  country!: string;
}
