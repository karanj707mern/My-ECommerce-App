import { IsString, MinLength, MaxLength, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'The user name',
    example: 'John Doe',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'The email address of the user',
    example: 'user@example.com',
    maxLength: 255,
  })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    description: 'The user password',
    example: 'password123',
    minLength: 6,
    maxLength: 128,
  })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;

  @ApiProperty({
    description: 'CAPTCHA ID from the CAPTCHA generation endpoint',
    example: 'abc123def456',
  })
  @IsString()
  @MinLength(1)
  captchaId!: string;

  @ApiProperty({
    description: 'CAPTCHA input text from the user',
    example: 'X7K9P2',
  })
  @IsString()
  @MinLength(1)
  captchaInput!: string;
}
