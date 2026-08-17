import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUserAddressDto {
  @IsString()
  @MaxLength(50)
  label!: string;

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
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

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

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
